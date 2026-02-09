import { useCallback, useEffect, useRef, useState } from "react";
import { RecordingService } from "@/services/audio";
import { useAudioSession } from "@/hooks/audio/use-audio-session";

type UseRecordingOptions = {
  enabled: boolean;
  immeubleId?: number | null;
};

export function useRecording({ enabled, immeubleId }: UseRecordingOptions) {
  const { connectionDetails, isConnected } = useAudioSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentEgressIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const operationIdRef = useRef(0);
  const isRecordingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);

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

  const startRecording = useCallback(async () => {
    if (!enabled || !isConnected || isRecordingRef.current || isStartingRef.current) {
      return;
    }
    if (!connectionDetails?.roomName) return;
    const operationId = operationIdRef.current + 1;
    operationIdRef.current = operationId;

    try {
      setIsStarting(true);
      setError(null);

      const result = await RecordingService.startRecording({
        roomName: connectionDetails.roomName,
        participantIdentity: connectionDetails.participantName,
        immeubleId: immeubleId ?? undefined,
        audioOnly: true,
      });

      if (!mountedRef.current || operationId !== operationIdRef.current) {
        try {
          await RecordingService.stopRecording(result.egressId);
        } catch (cleanupError) {
          void cleanupError;
        }
        return;
      }

      currentEgressIdRef.current = result.egressId;
      setIsRecording(true);
    } catch (err: any) {
      if (!mountedRef.current || operationId !== operationIdRef.current) {
        return;
      }
      setError(err?.message || "Erreur d'enregistrement");
      setIsRecording(false);
    } finally {
      if (mountedRef.current && operationId === operationIdRef.current) {
        setIsStarting(false);
      }
    }
  }, [connectionDetails, enabled, immeubleId, isConnected]);

  const stopRecording = useCallback(async () => {
    const operationId = operationIdRef.current + 1;
    operationIdRef.current = operationId;
    if (isStoppingRef.current) return;

    const egressId = currentEgressIdRef.current;
    currentEgressIdRef.current = null;

    if (mountedRef.current) {
      setIsRecording(false);
      setIsStarting(false);
    }

    if (!egressId) return;

    try {
      setIsStopping(true);
      setError(null);
      await RecordingService.stopRecording(egressId);
    } catch (err: any) {
      if (!mountedRef.current || operationId !== operationIdRef.current) {
        return;
      }
      setError(err?.message || "Erreur d'arrêt");
    } finally {
      if (mountedRef.current && operationId === operationIdRef.current) {
        setIsStopping(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (isRecordingRef.current || currentEgressIdRef.current || isStartingRef.current) {
        void stopRecording();
      }
      return;
    }
    void startRecording();
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
    error,
    startRecording,
    stopRecording,
    egressId: currentEgressIdRef.current,
  };
}
