import SwipeTabs from "@/components/navigation/SwipeTabs";
import ProfileMenuOverlay from "@/components/ProfileMenuOverlay";
import { useAutoAudio } from "@/hooks/audio/use-auto-audio";
import { ProfileMenuProvider, useProfileMenu } from "@/hooks/use-profile-menu";
import { HamburgerMenuProvider } from "@/hooks/use-hamburger-menu";
import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { LiveKitRoom } from "@livekit/react-native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Header() {
  const { open } = useProfileMenu();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerSafe, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.headerTitle}>Pro-Win</Text>
      <Feather name="user" size={20} color="#1F2937" onPress={open} />
    </View>
  );
}

function AppContent() {
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const { connectionDetails } = useAutoAudio(userId, role, true);

  return (
    <>
      <Header />
      {connectionDetails ? (
        <View style={styles.livekitHost}>
          <LiveKitRoom
            serverUrl={connectionDetails.serverUrl}
            token={connectionDetails.participantToken}
            connect
            audio
            video={false}
            onConnected={() => console.log("[LiveKit] connected")}
            onDisconnected={() => console.log("[LiveKit] disconnected")}
            onError={(err) => console.log("[LiveKit] error", err)}
          />
        </View>
      ) : null}
      <SwipeTabs index={index} onIndexChange={setIndex} />
      <ProfileMenuOverlay />
    </>
  );
}

export default function AppIndex() {
  return (
    <ProfileMenuProvider>
      <HamburgerMenuProvider>
        <View style={styles.container}>
          <AppContent />
        </View>
      </HamburgerMenuProvider>
    </ProfileMenuProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerSafe: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  livekitHost: {
    width: 0,
    height: 0,
    overflow: "hidden",
  },
});
