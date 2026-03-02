import AnimatedHeader from "@/components/navigation/AnimatedHeader";
import NavigationRail from "@/components/navigation/NavigationRail";
import SwipeTabs from "@/components/navigation/SwipeTabs";
import ProfileSheet from "@/components/ProfileSheet";
import { AudioSessionProvider } from "@/hooks/audio/use-audio-session";
import { useAutoAudio } from "@/hooks/audio/use-auto-audio";
import {
  ProfileSheetProvider,
  useProfileSheet,
} from "@/hooks/use-profile-sheet";
import { authService } from "@/services/auth";
import {
  AudioSession,
  AndroidAudioTypePresets,
  LiveKitRoom,
} from "@livekit/react-native";
import { AudioPresets } from "livekit-client";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    let mounted = true;

    const setupAudioSession = async () => {
      try {
        // MUST be called before startAudioSession()
        AudioSession.configureAudio({
          android: {
            audioTypeOptions: AndroidAudioTypePresets.communication,
          },
        });
        await AudioSession.startAudioSession();
      } catch (err) {
        if (__DEV__ && mounted) {
          console.error("[Audio] Impossible de demarrer la session audio", err);
        }
      }
    };

    void setupAudioSession();

    return () => {
      mounted = false;
      void AudioSession.stopAudioSession();
    };
  }, []);

  const {
    connectionDetails,
    onLiveKitConnected,
    onLiveKitDisconnected,
    onLiveKitError,
  } = useAutoAudio(userId, role, true);
  const isAudioConnected = !!connectionDetails;
  const audioSessionValue = {
    connectionDetails,
    isConnected: isAudioConnected,
  };

  const roomOptions = useMemo(
    () => ({
      audioCaptureDefaults: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        voiceIsolation: false,
      },
      publishDefaults: {
        audioPreset: AudioPresets.musicHighQuality,
        dtx: false,
        red: true,
      },
    }),
    [],
  );

  return (
    <AudioSessionProvider value={audioSessionValue}>
      <View style={styles.appLayout}>
        {showRail ? (
          <NavigationRail currentIndex={index} onNavigate={setIndex} />
        ) : null}
        <View style={styles.mainContent}>
          {showHeader ? <AnimatedHeader currentIndex={index} /> : null}
          {connectionDetails ? (
            <View style={styles.livekitHost}>
              <LiveKitRoom
                serverUrl={connectionDetails.serverUrl}
                token={connectionDetails.participantToken}
                connect
                audio
                video={false}
                options={roomOptions}
                onConnected={onLiveKitConnected}
                onDisconnected={onLiveKitDisconnected}
                onError={onLiveKitError}
              />
            </View>
          ) : null}
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
  livekitHost: {
    width: 0,
    height: 0,
    overflow: "hidden",
  },
});
