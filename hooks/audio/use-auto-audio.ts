import { useCallback, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { AudioMonitoringService } from "@/services/audio";
import { useTimeout } from "@/hooks/utils/async/use-timeout";
import type { TokenResponse } from "@/services/audio/monitoring/monitoring.types";

export function useAutoAudio(userId: number | null, userType: string | null, enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<TokenResponse | null>(null);

  const startAudioPublishing = useCallback(async () => {
    if (!userId || !userType || !enabled || isConnecting || isConnected) return;

    try {
      setIsConnecting(true);
      setError(null);

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError("Permission micro refusee");
          return;
        }
      }

      const details = await AudioMonitoringService.generateUserToken(userType);
      setConnectionDetails(details);
      setIsConnected(true);
    } catch (err: any) {
      setError(err?.message || "Erreur de connexion audio");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [userId, userType, enabled, isConnecting, isConnected]);

  const stopAudioPublishing = useCallback(async () => {
    setIsConnected(false);
    setConnectionDetails(null);
    setError(null);
  }, []);

  const restartAudioPublishing = useCallback(async () => {
    await stopAudioPublishing();
    await startAudioPublishing();
  }, [stopAudioPublishing, startAudioPublishing]);

  useTimeout(startAudioPublishing, 600, {
    autoStart: !!userId && !!userType && enabled && !isConnected && !isConnecting,
  });

  return {
    isConnected,
    isConnecting,
    error,
    connectionDetails,
    startAudioPublishing,
    stopAudioPublishing,
    restartAudioPublishing,
    roomName: connectionDetails?.roomName,
    participantName: connectionDetails?.participantName,
  };
}
