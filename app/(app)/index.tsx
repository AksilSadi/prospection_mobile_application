import AnimatedHeader from "@/components/navigation/AnimatedHeader";
import NavigationRail from "@/components/navigation/NavigationRail";
import SwipeTabs from "@/components/navigation/SwipeTabs";
import ProfileSheet from "@/components/ProfileSheet";
import { AudioSessionProvider } from "@/hooks/audio/use-audio-session";
import {
  ProfileSheetProvider,
  useProfileSheet,
} from "@/hooks/use-profile-sheet";
import { authService } from "@/services/auth";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

function AppContent() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
  const [showRail, setShowRail] = useState(true);
  const { sheetRef } = useProfileSheet();

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const keepSessionAlive = async () => {
      const valid = await authService.ensureValidSession(120);
      if (!valid && !cancelled) {
        router.replace("/(auth)/login");
      }
    };

    void keepSessionAlive();
    const intervalId = setInterval(() => {
      void keepSessionAlive();
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [router]);

  const audioSessionValue = {
    connectionDetails: null,
    isConnected: false,
  };

  return (
    <AudioSessionProvider value={audioSessionValue}>
      <View style={styles.appLayout}>
        {showRail ? (
          <NavigationRail currentIndex={index} onNavigate={setIndex} />
        ) : null}
        <View style={styles.mainContent}>
          {showHeader ? <AnimatedHeader currentIndex={index} /> : null}
          <SwipeTabs
            index={index}
            onIndexChange={setIndex}
            onHeaderVisibilityChange={setShowHeader}
            onRailVisibilityChange={setShowRail}
          />
        </View>
      </View>
      <ProfileSheet ref={sheetRef} userId={userId} role={role} />
    </AudioSessionProvider>
  );
}

export default function AppIndex() {
  return (
    <ProfileSheetProvider>
      <View style={styles.container}>
        <AppContent />
      </View>
    </ProfileSheetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  appLayout: {
    flex: 1,
    flexDirection: "row",
  },
  mainContent: {
    flex: 1,
  },
});
