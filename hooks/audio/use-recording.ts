import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioSession } from "@/hooks/audio/use-audio-session";
import { authService } from "@/services/auth";
import {
  startLocalRecording,
  stopLocalRecording,
  isLocalRecording,
} from "@/services/audio/recordings/local-recording.service";
import { uploadRecording } from "@/services/audio/recordings/recording-upload.service";
import {
  enqueueUpload,
  enableUploadQueueAutoSync,
} from "@/services/audio/recordings/upload-queue.service";
import { RecordingService } from "@/services/audio/recordings/recording.service";

type UseRecordingOptions = {
  enabled: boolean;
  immeubleId?: number | null;
};

type RecordingContext = {
  roomName: string;
  participantName?: string | null;
};

export function useRecording({ enabled, immeubleId }: UseRecordingOptions) {
  const { connectionDetails, isConnected } = useAudioSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const operationIdRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const isConnectedRef = useRef(isConnected);
  const connectionDetailsRef = useRef(connectionDetails);
  const egressIdRef = useRef<string | null>(null);
  const recordingContextRef = useRef<RecordingContext | null>(null);
  const lastKnownContextRef = useRef<RecordingContext | null>(null);
  const recordingRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    void enableUploadQueueAutoSync();
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

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    connectionDetailsRef.current = connectionDetails;
    if (!connectionDetails?.roomName) return;
    lastKnownContextRef.current = {
      roomName: connectionDetails.roomName,
      participantName: connectionDetails.participantName,
    };
  }, [connectionDetails]);

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
    const details = connectionDetailsRef.current;

    if (details?.roomName) {
      return {
        roomName: details.roomName,
        participantName: details.participantName,
      };
    }

    if (lastKnownContextRef.current?.roomName) {
      return lastKnownContextRef.current;
    }

    return resolveContextFromAuth();
  }, [resolveContextFromAuth]);

  const startRecording = useCallback(async () => {
    if (!enabled || isRecordingRef.current || isStartingRef.current) {
      if (__DEV__) console.log("[useRecording] startRecording skipped. enabled:", enabled, "isRecording:", isRecordingRef.current, "isStarting:", isStartingRef.current);
      return;
    }

    const opId = ++operationIdRef.current;
    const runId = `${Date.now()}-${opId}`;
    recordingRunIdRef.current = runId;
    if (__DEV__) console.log("[useRecording] === START RECORDING === opId:", opId, "room:", connectionDetails?.roomName, "immeubleId:", immeubleId);

    try {
      setIsStarting(true);
      setError(null);

      const context = await resolveRecordingContext();
      if (context?.roomName) {
        recordingContextRef.current = context;
        if (__DEV__) console.log("[useRecording] Saved recording context:", recordingContextRef.current);
      } else {
        recordingContextRef.current = null;
        if (__DEV__) console.warn("[useRecording] No room context available at start. Upload will be skipped if context cannot be recovered at stop.");
      }

      await startLocalRecording();

      if (context?.roomName && isConnectedRef.current) {
        RecordingService.startRecording({
          roomName: context.roomName,
          participantIdentity: context.participantName,
          immeubleId: immeubleId ?? undefined,
          audioOnly: true,
        })
          .then((res) => {
            const isCurrentRun =
              mountedRef.current &&
              recordingRunIdRef.current === runId &&
              opId === operationIdRef.current &&
              enabledRef.current &&
              isLocalRecording() &&
              isConnectedRef.current;

            if (!isCurrentRun) {
              if (__DEV__) console.log("[useRecording] Late Egress start response, stopping stale Egress:", res.egressId);
              RecordingService.stopRecording(res.egressId).catch((err) => {
                if (__DEV__) console.warn("[useRecording] Failed to stop stale Egress:", err);
              });
              return;
            }

            egressIdRef.current = res.egressId;
            if (__DEV__) console.log("[useRecording] Egress started:", res.egressId);
          })
          .catch((err) => {
            if (__DEV__) console.warn("[useRecording] Egress start failed (local continues):", err);
          });
      }

      if (!mountedRef.current || opId !== operationIdRef.current) {
        const result = await stopLocalRecording();
        const ctx = recordingContextRef.current ?? context;
        recordingContextRef.current = null;
        recordingRunIdRef.current = null;
        if (result && ctx?.roomName) {
          const input = {
            fileUri: result.fileUri,
            roomName: ctx.roomName,
            durationMs: result.durationMs,
            fileSize: result.fileSize,
            immeubleId: immeubleId ?? undefined,
            participantIdentity: ctx.participantName,
          };
          uploadRecording(input).catch(() => void enqueueUpload(input));
        }
        return;
      }

      setIsRecording(true);
    } catch (err: unknown) {
      if (!mountedRef.current || opId !== operationIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Recording start failed";
      if (__DEV__) console.error("[Recording] Start error:", msg);
      setError(msg);
      setIsRecording(false);
    } finally {
      if (mountedRef.current && opId === operationIdRef.current) {
        setIsStarting(false);
      }
    }
  }, [connectionDetails, enabled, immeubleId, resolveRecordingContext]);

  const stopRecording = useCallback(async () => {
    const opId = ++operationIdRef.current;
    if (isStoppingRef.current) return;

    recordingRunIdRef.current = null;

    if (mountedRef.current) {
      setIsRecording(false);
      setIsStarting(false);
    }

    if (!isLocalRecording() && !egressIdRef.current) {
      if (__DEV__) console.log("[useRecording] stopRecording skipped — nothing active");
      return;
    }

    if (__DEV__) console.log("[useRecording] === STOP RECORDING === opId:", opId, "localActive:", isLocalRecording(), "egressId:", egressIdRef.current);

    try {
      if (mountedRef.current) setIsStopping(true);
      setError(null);

      if (egressIdRef.current) {
        const eid = egressIdRef.current;
        egressIdRef.current = null;
        if (__DEV__) console.log("[useRecording] Stopping Egress:", eid);
        RecordingService.stopRecording(eid).catch((err) => {
          if (__DEV__) console.warn("[useRecording] Egress stop failed:", err);
        });
      }

      const result = await stopLocalRecording();

      if (!result) {
        if (__DEV__) console.log("[useRecording] No local recording result (null)");
        recordingContextRef.current = null;
        return;
      }

      let ctx = recordingContextRef.current;
      if (!ctx?.roomName) {
        ctx = await resolveRecordingContext();
      }
      recordingContextRef.current = null;

      if (__DEV__) console.log("[useRecording] Local recording stopped. file:", result.fileUri, "duration:", result.durationMs, "ms", "size:", result.fileSize, "ctx:", ctx);

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

        try {
          if (__DEV__) console.log("[useRecording] Attempting direct upload...");
          await uploadRecording(input);
          if (__DEV__) console.log("[useRecording] Direct upload succeeded");
        } catch (uploadErr) {
          if (__DEV__) console.warn("[useRecording] Direct upload failed, enqueueing:", uploadErr);
          await enqueueUpload(input);
          if (__DEV__) console.log("[useRecording] Enqueued for later upload");
        }
      } else {
        if (__DEV__) console.warn("[useRecording] No recording context, cannot upload. File kept:", result.fileUri);
      }
    } catch (err: unknown) {
      if (!mountedRef.current || opId !== operationIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Recording stop failed";
      if (__DEV__) console.error("[useRecording] Stop error:", msg);
      setError(msg);
    } finally {
      if (mountedRef.current && opId === operationIdRef.current) {
        setIsStopping(false);
        setIsUploading(false);
      }
    }
  }, [immeubleId, resolveRecordingContext]);

  useEffect(() => {
    if (__DEV__) console.log("[useRecording] Enable effect. enabled:", enabled, "isRecording:", isRecordingRef.current);

    if (!enabled) {
      if (isRecordingRef.current || isStartingRef.current) {
        if (__DEV__) console.log("[useRecording] Disabled → stopping local + egress");
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
    if (!isConnected && egressIdRef.current) {
      if (__DEV__) console.log("[useRecording] Connection lost → stopping Egress only (local continues)");
      const eid = egressIdRef.current;
      egressIdRef.current = null;
      RecordingService.stopRecording(eid).catch((err) => {
        if (__DEV__) console.warn("[useRecording] Egress stop on disconnect failed:", err);
      });
    }
  }, [isConnected]);

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
    error,
    startRecording,
    stopRecording,
  };
}
