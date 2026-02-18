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
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);
  const wasOnlineRef = useRef(getIsOnline());
  const consecutiveErrorsRef = useRef(0);

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
      consecutiveErrorsRef.current = 0;
    } catch (err: any) {
      if (__DEV__) {
        console.error("[Audio] Erreur connexion audio", err);
      }
      consecutiveErrorsRef.current += 1;
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

  const retryDelay = Math.min(600 * Math.pow(2, consecutiveErrorsRef.current), 60000);

  useTimeout(startAudioPublishing, retryDelay, {
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

  const onLiveKitConnected = useCallback(() => {
    if (__DEV__) console.log("[Audio] LiveKit connected");
    setIsLiveKitConnected(true);
    consecutiveErrorsRef.current = 0;
  }, []);

  const onLiveKitDisconnected = useCallback(() => {
    if (__DEV__) console.log("[Audio] LiveKit disconnected");
    setIsLiveKitConnected(false);
  }, []);

  const onLiveKitError = useCallback((err: any) => {
    const msg = String(err?.message ?? err ?? "");
    if (__DEV__) console.error("[Audio] LiveKit error:", msg);
    if (msg.toLowerCase().includes("permission")) {
      consecutiveErrorsRef.current += 1;
      setConnectionDetails(null);
      setIsConnected(false);
    }
  }, []);

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
    onLiveKitConnected,
    onLiveKitDisconnected,
    onLiveKitError,
  };
}
