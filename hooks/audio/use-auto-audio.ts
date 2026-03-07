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

const LIVEKIT_CONNECTION_ERROR = "could not establish pc connection";

function isRecoverableLiveKitOfferError(message: string): boolean {
  return (
    message.includes("unable to set offer") ||
    message.includes("local fingerprint does not match identity") ||
    message.includes("failed to apply the description") ||
    message.includes("error_content")
  );
}

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
  const [isOnline, setIsOnline] = useState(getIsOnline());
  const wasOnlineRef = useRef(getIsOnline());
  const consecutiveErrorsRef = useRef(0);
  const stopRequestedRef = useRef(false);
  const isStartingRef = useRef(false);

  const startAudioPublishing = useCallback(async () => {
    if (!userId || !userType || !enabled || isConnected || isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;
    stopRequestedRef.current = false;

    if (!getIsOnline()) {
      setIsConnected(false);
      setConnectionDetails(null);
      isStartingRef.current = false;
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
      isStartingRef.current = false;
      setIsConnecting(false);
    }
  }, [userId, userType, enabled, isConnected]);

  const stopAudioPublishing = useCallback(async () => {
    stopRequestedRef.current = true;
    isStartingRef.current = false;
    setIsConnected(false);
    setConnectionDetails(null);
    setError(null);
  }, []);

  const restartAudioPublishing = useCallback(async () => {
    await stopAudioPublishing();
    await startAudioPublishing();
  }, [stopAudioPublishing, startAudioPublishing]);

  const retryDelay = Math.min(3000 * Math.pow(2, consecutiveErrorsRef.current), 60000);

  useTimeout(startAudioPublishing, retryDelay, {
    autoStart:
      !!userId &&
      !!userType &&
      enabled &&
      isOnline &&
      !stopRequestedRef.current &&
      !isConnected &&
      !isConnecting,
  });

  useEffect(() => {
    ensureConnectivityMonitoring();
    const unsubscribe = subscribeConnectivity((online) => {
      setIsOnline(online);

      if (!enabled) {
        wasOnlineRef.current = online;
        return;
      }

      if (!online) {
        wasOnlineRef.current = false;
        setConnectionDetails(null);
        setIsConnected(false);
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

  const onLiveKitConnected = useCallback(() => {
    if (__DEV__) console.log("[Audio] LiveKit connected");
    consecutiveErrorsRef.current = 0;
  }, []);

  const onLiveKitDisconnected = useCallback(() => {
    if (__DEV__) console.log("[Audio] LiveKit disconnected");

    if (stopRequestedRef.current) {
      return;
    }

    setConnectionDetails(null);
    setIsConnected(false);
  }, []);

  const onLiveKitError = useCallback((err: unknown) => {
    const msg = getErrorMessage(err);
    const message = msg.toLowerCase();
    const hasRecoverableOfferError = isRecoverableLiveKitOfferError(message);

    if (__DEV__) console.error("[Audio] LiveKit error:", msg);

    if (
      hasRecoverableOfferError ||
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
