import AnimatedHeader from "@/components/navigation/AnimatedHeader";
import SwipeTabs from "@/components/navigation/SwipeTabs";
import ProfileSheet from "@/components/ProfileSheet";
import { AudioSessionProvider } from "@/hooks/audio/use-audio-session";
import { useAutoAudio } from "@/hooks/audio/use-auto-audio";
import { HamburgerMenuProvider } from "@/hooks/use-hamburger-menu";
import {
  ProfileSheetProvider,
  useProfileSheet,
} from "@/hooks/use-profile-sheet";
import { authService } from "@/services/auth";
import { LiveKitRoom } from "@livekit/react-native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

function AppContent() {
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showHeader, setShowHeader] = useState(true);
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
  const isAudioConnected = !!connectionDetails;
  const audioSessionValue = {
    connectionDetails,
    isConnected: isAudioConnected,
  };

  return (
    <AudioSessionProvider value={audioSessionValue}>
      {showHeader ? <AnimatedHeader currentIndex={index} /> : null}
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
      <SwipeTabs
        index={index}
        onIndexChange={setIndex}
        onHeaderVisibilityChange={setShowHeader}
      />
      <ProfileSheet ref={sheetRef} userId={userId} role={role} />
    </AudioSessionProvider>
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
