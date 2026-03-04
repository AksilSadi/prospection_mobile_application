import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

const RECORDINGS_DIR = `${FileSystem.cacheDirectory}recordings/`;

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  web: {
    mimeType: "audio/mp4",
    bitsPerSecond: 128000,
  },
};

let activeRecording: Audio.Recording | null = null;

async function ensureDirectory(): Promise<void> {
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

export type LocalRecordingResult = {
  fileUri: string;
  durationMs: number;
  fileSize: number;
};

export async function startLocalRecording(): Promise<void> {
  if (activeRecording) {
    if (__DEV__) console.warn("[LocalRecording] Already recording, ignoring start");
    return;
  }

  if (__DEV__) console.log("[LocalRecording] Starting local recording...");
  await ensureDirectory();

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
  activeRecording = recording;
  if (__DEV__) console.log("[LocalRecording] Recording started, URI:", recording.getURI());
}

export async function stopLocalRecording(): Promise<LocalRecordingResult | null> {
  if (!activeRecording) {
    if (__DEV__) console.log("[LocalRecording] stopLocalRecording called but no active recording");
    return null;
  }

  if (__DEV__) console.log("[LocalRecording] Stopping local recording...");
  const recording = activeRecording;
  activeRecording = null;

  try {
    await recording.stopAndUnloadAsync();
  } catch (err) {
    if (__DEV__) console.error("[LocalRecording] stopAndUnloadAsync failed:", err);
    return null;
  } finally {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  }

  const uri = recording.getURI();
  if (!uri) {
    if (__DEV__) console.warn("[LocalRecording] No URI after stop");
    return null;
  }

  const status = await recording.getStatusAsync();
  const durationMs = status.durationMillis ?? 0;
  if (__DEV__) console.log("[LocalRecording] Stopped. URI:", uri, "duration:", durationMs, "ms");

  if (durationMs < 1000) {
    if (__DEV__) console.log("[LocalRecording] Duration < 1s, discarding");
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return null;
  }

  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileSize = fileInfo.exists ? fileInfo.size : 0;
  if (__DEV__) console.log("[LocalRecording] File size:", fileSize, "bytes");

  return { fileUri: uri, durationMs, fileSize };
}

export function isLocalRecording(): boolean {
  return activeRecording !== null;
}

export async function cleanupRecordings(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(RECORDINGS_DIR, { idempotent: true });
    }
  } catch {
    void 0;
  }
}
