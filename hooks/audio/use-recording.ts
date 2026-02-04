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

  const startRecording = useCallback(async () => {
    if (!enabled || !isConnected || isRecording || isStarting) return;
    if (!connectionDetails?.roomName) return;

    try {
      setIsStarting(true);
      setError(null);

      const result = await RecordingService.startRecording({
        roomName: connectionDetails.roomName,
        participantIdentity: connectionDetails.participantName,
        immeubleId: immeubleId ?? undefined,
        audioOnly: true,
      });

      currentEgressIdRef.current = result.egressId;
      setIsRecording(true);
    } catch (err: any) {
      setError(err?.message || "Erreur d'enregistrement");
      setIsRecording(false);
    } finally {
      setIsStarting(false);
    }
  }, [connectionDetails, enabled, immeubleId, isConnected, isRecording, isStarting]);

  const stopRecording = useCallback(async () => {
    if (!currentEgressIdRef.current || isStopping) return;

    try {
      setIsStopping(true);
      setError(null);
      await RecordingService.stopRecording(currentEgressIdRef.current);
      currentEgressIdRef.current = null;
      setIsRecording(false);
    } catch (err: any) {
      setError(err?.message || "Erreur d'arrêt");
    } finally {
      setIsStopping(false);
    }
  }, [isStopping]);

  useEffect(() => {
    if (!enabled) {
      if (isRecording) {
        void stopRecording();
      }
      return;
    }
    void startRecording();
  }, [enabled, isRecording, startRecording, stopRecording]);

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
