import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { BackgroundAudioService } from "@/services/audio";
import { authService } from "@/services/auth";
import {
  startLocalRecording,
  stopLocalRecording,
  isLocalRecording,
  writeRecordingRecovery,
  deleteRecordingRecovery,
} from "@/services/audio/recordings/local-recording.service";
import {
  enqueueUpload,
} from "@/services/audio/recordings/upload-queue.service";

type UseRecordingOptions = {
  enabled: boolean;
  immeubleId?: number | null;
};

type RecordingContext = {
  roomName: string;
  participantName?: string | null;
};

export function useRecording({ enabled, immeubleId }: UseRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mountedRef = useRef(true);
  const operationIdRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const stopInFlightRef = useRef(false);
  const enabledRef = useRef(enabled);
  const recordingContextRef = useRef<RecordingContext | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isStartingRef.current = isStarting;
  }, [isStarting]);

  useEffect(() => {
    isStoppingRef.current = isStopping;
  }, [isStopping]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const resolveContextFromAuth = useCallback(async (): Promise<RecordingContext | null> => {
    try {
      const [role, userId] = await Promise.all([
        authService.getUserRole(),
        authService.getUserId(),
      ]);

      if (!role || !userId) {
        return null;
      }

      const normalizedRole = role.toLowerCase();
      if (normalizedRole !== "commercial" && normalizedRole !== "manager") {
        return null;
      }

      return {
        roomName: `room:${normalizedRole}:${userId}`,
        participantName: `${normalizedRole}-${userId}`,
      };
    } catch {
      return null;
    }
  }, []);

  const resolveRecordingContext = useCallback(async (): Promise<RecordingContext | null> => {
    const authContext = await resolveContextFromAuth();
    if (authContext?.roomName) {
      return authContext;
    }

    return recordingContextRef.current;
  }, [resolveContextFromAuth]);

  const startBackgroundRecordingService = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== "android") {
      return false;
    }

    if (AppState.currentState !== "active") {
      if (__DEV__) {
        console.warn(
          "[useRecording] Skip background service start: app not active",
          AppState.currentState,
        );
      }
      return false;
    }

    try {
      await BackgroundAudioService.start();
      return BackgroundAudioService.isRunning();
    } catch (err) {
      if (__DEV__) {
        console.warn("[useRecording] Failed to start background recording service:", err);
      }
      return false;
    }
  }, []);

  const stopBackgroundRecordingService = useCallback(async (): Promise<void> => {
    if (Platform.OS !== "android") {
      return;
    }

    try {
      await BackgroundAudioService.stop();
    } catch (err) {
      if (__DEV__) {
        console.warn("[useRecording] Failed to stop background recording service:", err);
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!enabled || isRecordingRef.current || isStartingRef.current) {
      if (__DEV__) console.log("[useRecording] startRecording skipped. enabled:", enabled, "isRecording:", isRecordingRef.current, "isStarting:", isStartingRef.current);
      return;
    }

    const opId = ++operationIdRef.current;
    if (__DEV__) console.log("[useRecording] === START RECORDING === opId:", opId, "immeubleId:", immeubleId);

    let backgroundServiceRunning = false;

    try {
      setIsStarting(true);

      let context = await resolveRecordingContext();
      if (!context?.roomName) {
        if (__DEV__) console.log("[useRecording] Context null, retrying in 1s...");
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        context = await resolveRecordingContext();
      }
      if (context?.roomName) {
        recordingContextRef.current = context;
        if (__DEV__) console.log("[useRecording] Saved recording context:", recordingContextRef.current);
      } else {
        recordingContextRef.current = null;
        if (__DEV__) console.warn("[useRecording] No room context available at start. Upload will be skipped if context cannot be recovered at stop.");
      }

      backgroundServiceRunning = await startBackgroundRecordingService();
      await startLocalRecording();

      if (!mountedRef.current || opId !== operationIdRef.current) {
        const result = await stopLocalRecording();
        if (backgroundServiceRunning) {
          await stopBackgroundRecordingService();
        }
        const ctx = recordingContextRef.current ?? context;
        recordingContextRef.current = null;
        if (result && ctx?.roomName) {
          const input = {
            fileUri: result.fileUri,
            roomName: ctx.roomName,
            durationMs: result.durationMs,
            fileSize: result.fileSize,
            immeubleId: immeubleId ?? undefined,
            participantIdentity: ctx.participantName,
          };
          await writeRecordingRecovery(result.fileUri, input);
          try {
            await enqueueUpload(input);
            await deleteRecordingRecovery(result.fileUri);
          } catch (queueErr) {
            if (__DEV__) {
              console.warn("[useRecording] Failed to enqueue stale recording (recovery preserved):", queueErr);
            }
          }
        }
        return;
      }

      setIsRecording(true);
    } catch (err: unknown) {
      if (!mountedRef.current || opId !== operationIdRef.current) return;
      if (__DEV__) {
        const msg = err instanceof Error ? err.message : "Recording start failed";
        console.error("[Recording] Start error:", msg);
      }
      if (backgroundServiceRunning) {
        await stopBackgroundRecordingService();
      }
      setIsRecording(false);
    } finally {
      if (mountedRef.current && opId === operationIdRef.current) {
        setIsStarting(false);
      }
    }
  }, [
    enabled,
    immeubleId,
    resolveRecordingContext,
    startBackgroundRecordingService,
    stopBackgroundRecordingService,
  ]);

  const stopRecording = useCallback(async () => {
    if (stopInFlightRef.current || isStoppingRef.current) return;
    stopInFlightRef.current = true;
    const opId = ++operationIdRef.current;

    if (mountedRef.current) {
      setIsRecording(false);
      setIsStarting(false);
    }

    if (!isLocalRecording()) {
      if (__DEV__) console.log("[useRecording] stopRecording skipped — nothing active");
      await stopBackgroundRecordingService();
      stopInFlightRef.current = false;
      return;
    }

    if (__DEV__) console.log("[useRecording] === STOP RECORDING === opId:", opId, "localActive:", isLocalRecording());

    try {
      if (mountedRef.current) setIsStopping(true);

      const result = await stopLocalRecording();

      if (!result) {
        if (__DEV__) console.warn("[useRecording] No local recording result. Recording could not be finalized.");
        recordingContextRef.current = null;
        return;
      }

      let ctx = recordingContextRef.current;
      if (!ctx?.roomName) {
        ctx = await resolveRecordingContext();
      }
      recordingContextRef.current = null;

      if (__DEV__) console.log("[useRecording] Local recording stopped. file:", result.fileUri, "duration:", result.durationMs, "ms", "size:", result.fileSize, "recovered:", !!result.isRecovered, "ctx:", ctx);

      if (ctx?.roomName) {
        if (mountedRef.current) setIsUploading(true);

        const input = {
          fileUri: result.fileUri,
          roomName: ctx.roomName,
          durationMs: result.durationMs,
          fileSize: result.fileSize,
          immeubleId: immeubleId ?? undefined,
          participantIdentity: ctx.participantName,
        };

        await writeRecordingRecovery(result.fileUri, input);

        try {
          if (__DEV__) console.log("[useRecording] Enqueueing recording for upload queue...");
          await enqueueUpload(input);
          if (__DEV__) console.log("[useRecording] Recording enqueued");
          await deleteRecordingRecovery(result.fileUri);
        } catch (queueErr) {
          if (__DEV__) console.warn("[useRecording] Failed to enqueue (recovery file preserved):", queueErr);
        }
      } else {
        if (__DEV__) console.warn("[useRecording] No recording context, cannot upload. File kept:", result.fileUri);
      }
    } catch (err: unknown) {
      if (!mountedRef.current || opId !== operationIdRef.current) return;
      if (__DEV__) {
        const msg = err instanceof Error ? err.message : "Recording stop failed";
        console.error("[useRecording] Stop error:", msg);
      }
    } finally {
      await stopBackgroundRecordingService();
      stopInFlightRef.current = false;
      if (mountedRef.current) {
        setIsStopping(false);
        setIsUploading(false);
      }
    }
  }, [immeubleId, resolveRecordingContext, stopBackgroundRecordingService]);

  useEffect(() => {
    if (__DEV__) console.log("[useRecording] Enable effect. enabled:", enabled, "isRecording:", isRecordingRef.current);

    if (!enabled) {
      if (isRecordingRef.current || isStartingRef.current) {
        if (__DEV__) console.log("[useRecording] Disabled → stopping local recording");
        void stopRecording();
      }
      return;
    }

    if (!isRecordingRef.current && !isStartingRef.current) {
      if (__DEV__) console.log("[useRecording] Enabled → starting local recording");
      void startRecording();
    }
  }, [enabled, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      void stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    isStarting,
    isStopping,
    isUploading,
    startRecording,
    stopRecording,
  };
}
