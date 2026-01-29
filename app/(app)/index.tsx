import SwipeTabs from "@/components/navigation/SwipeTabs";
import AnimatedHeader from "@/components/navigation/AnimatedHeader";
import ProfileSheet from "@/components/ProfileSheet";
import { useAutoAudio } from "@/hooks/audio/use-auto-audio";
import { ProfileSheetProvider, useProfileSheet } from "@/hooks/use-profile-sheet";
import { HamburgerMenuProvider } from "@/hooks/use-hamburger-menu";
import { authService } from "@/services/auth";
import { LiveKitRoom } from "@livekit/react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

function AppContent() {
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
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

  const { connectionDetails } = useAutoAudio(userId, role, true);

  return (
    <>
      <AnimatedHeader currentIndex={index} />
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
      <ProfileSheet ref={sheetRef} userId={userId} role={role} />
    </>
  );
}

export default function AppIndex() {
  return (
    <ProfileSheetProvider>
      <HamburgerMenuProvider>
        <View style={styles.container}>
          <AppContent />
        </View>
      </HamburgerMenuProvider>
    </ProfileSheetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  livekitHost: {
    width: 0,
    height: 0,
    overflow: "hidden",
  },
});
