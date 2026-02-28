import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus, PermissionsAndroid, Platform } from "react-native";
import { AudioMonitoringService, BackgroundAudioService } from "@/services/audio";
import { useTimeout } from "@/hooks/utils/async/use-timeout";
import type { TokenResponse } from "@/services/audio/monitoring/monitoring.types";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";

const LIVEKIT_CONNECTION_ERROR = "could not establish pc connection";

function normalizeServerUrl(url: string): string {
  const raw = String(url ?? "").trim();
  if (!raw) {
    return raw;
  }

  if (raw.startsWith("wss://") || raw.startsWith("ws://")) {
    return raw.replace(/\/+$/, "");
  }

  if (raw.startsWith("https://")) {
    return `wss://${raw.slice("https://".length)}`.replace(/\/+$/, "");
  }

  if (raw.startsWith("http://")) {
    return `ws://${raw.slice("http://".length)}`.replace(/\/+$/, "");
  }

  return `wss://${raw}`.replace(/\/+$/, "");
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err ?? "");
}

export function useAutoAudio(userId: number | null, userType: string | null, enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<TokenResponse | null>(null);
  const [isLiveKitConnected, setIsLiveKitConnected] = useState(false);
  const wasOnlineRef = useRef(getIsOnline());
  const consecutiveErrorsRef = useRef(0);
  const stopRequestedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const startAudioPublishing = useCallback(async () => {
    if (!userId || !userType || !enabled || isConnecting || isConnected) return;

    stopRequestedRef.current = false;

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
          stopRequestedRef.current = true;
          setError(null);
          return;
        }
      }

      const details = await AudioMonitoringService.generateUserToken(userType);
      setConnectionDetails({
        ...details,
        serverUrl: normalizeServerUrl(details.serverUrl),
      });
      setIsConnected(true);
      consecutiveErrorsRef.current = 0;
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (__DEV__) {
        console.error("[Audio] Erreur connexion audio", message);
      }
      consecutiveErrorsRef.current += 1;
      setError(null);
      setIsConnected(false);
      setConnectionDetails(null);
    } finally {
      setIsConnecting(false);
    }
  }, [userId, userType, enabled, isConnecting, isConnected]);

  const stopAudioPublishing = useCallback(async () => {
    stopRequestedRef.current = true;
    await BackgroundAudioService.stop();
    setIsConnected(false);
    setIsLiveKitConnected(false);
    setConnectionDetails(null);
    setError(null);
  }, []);

  const restartAudioPublishing = useCallback(async () => {
    await stopAudioPublishing();
    await startAudioPublishing();
  }, [stopAudioPublishing, startAudioPublishing]);

  const retryDelay = Math.min(600 * Math.pow(2, consecutiveErrorsRef.current), 60000);

  useTimeout(startAudioPublishing, retryDelay, {
    autoStart:
      !!userId && !!userType && enabled && !stopRequestedRef.current && !isConnected && !isConnecting,
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
        stopRequestedRef.current = false;
        void restartAudioPublishing();
      }
    });
    return unsubscribe;
  }, [enabled, restartAudioPublishing]);

  useEffect(() => {
    if (!enabled) {
      void BackgroundAudioService.stop();
      return;
    }

    const onAppStateChange = (nextState: AppStateStatus) => {
      appStateRef.current = nextState;

      if (!connectionDetails || !isLiveKitConnected) {
        return;
      }

      if (nextState === "active") {
        void BackgroundAudioService.stop();
        return;
      }

      if (nextState === "background" || nextState === "inactive") {
        void BackgroundAudioService.start();
      }
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      subscription.remove();
      void BackgroundAudioService.stop();
    };
  }, [connectionDetails, enabled, isLiveKitConnected]);

  const onLiveKitConnected = useCallback(() => {
    if (__DEV__) console.log("[Audio] LiveKit connected");
    setIsLiveKitConnected(true);
    consecutiveErrorsRef.current = 0;

    if (appStateRef.current !== "active") {
      void BackgroundAudioService.start();
    }
  }, []);

  const onLiveKitDisconnected = useCallback(() => {
    if (__DEV__) console.log("[Audio] LiveKit disconnected");
    setIsLiveKitConnected(false);

    void BackgroundAudioService.stop();

    if (stopRequestedRef.current) {
      return;
    }

    setConnectionDetails(null);
    setIsConnected(false);
  }, []);

  const onLiveKitError = useCallback((err: unknown) => {
    const msg = getErrorMessage(err);
    const message = msg.toLowerCase();

    if (__DEV__) console.error("[Audio] LiveKit error:", msg);

    void BackgroundAudioService.stop();

    if (
      message.includes("permission") ||
      message.includes("service not found") ||
      message.includes("handshake") ||
      message.includes(LIVEKIT_CONNECTION_ERROR)
    ) {
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
