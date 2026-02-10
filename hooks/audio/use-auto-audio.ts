import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { AudioMonitoringService } from "@/services/audio";
import { useTimeout } from "@/hooks/utils/async/use-timeout";
import type { TokenResponse } from "@/services/audio/monitoring/monitoring.types";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";

export function useAutoAudio(userId: number | null, userType: string | null, enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<TokenResponse | null>(null);
  const wasOnlineRef = useRef(getIsOnline());

  const startAudioPublishing = useCallback(async () => {
    if (!userId || !userType || !enabled || isConnecting || isConnected) return;
    if (!getIsOnline()) {
      setIsConnected(false);
      setConnectionDetails(null);
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          if (__DEV__) {
            console.error("[Audio] Permission micro refusee");
          }
          setError(null);
          return;
        }
      }

      const details = await AudioMonitoringService.generateUserToken(userType);
      setConnectionDetails(details);
      setIsConnected(true);
    } catch (err: any) {
      if (__DEV__) {
        console.error("[Audio] Erreur connexion audio", err);
      }
      setError(null);
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

  useEffect(() => {
    ensureConnectivityMonitoring();
    const unsubscribe = subscribeConnectivity((online) => {
      if (!enabled) {
        wasOnlineRef.current = online;
        return;
      }
      if (!online) {
        wasOnlineRef.current = false;
        setIsConnected(false);
        setConnectionDetails(null);
        return;
      }
      const cameBackOnline = !wasOnlineRef.current && online;
      wasOnlineRef.current = online;
      if (cameBackOnline) {
        void restartAudioPublishing();
      }
    });
    return unsubscribe;
  }, [enabled, restartAudioPublishing]);

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
