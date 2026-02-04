import { createContext, useContext } from "react";
import type { TokenResponse } from "@/services/audio";

type AudioSession = {
  connectionDetails: TokenResponse | null;
  isConnected: boolean;
};

const AudioSessionContext = createContext<AudioSession | null>(null);

type AudioSessionProviderProps = {
  value: AudioSession;
  children: React.ReactNode;
};

export function AudioSessionProvider({
  value,
  children,
}: AudioSessionProviderProps) {
  return (
    <AudioSessionContext.Provider value={value}>
      {children}
    </AudioSessionContext.Provider>
  );
}

export function useAudioSession() {
  const ctx = useContext(AudioSessionContext);
  if (!ctx) {
    return { connectionDetails: null, isConnected: false };
  }
  return ctx;
}
