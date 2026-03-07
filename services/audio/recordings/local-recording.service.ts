import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

const RECORDING_STORAGE_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
const RECORDINGS_DIR = `${RECORDING_STORAGE_DIR ?? ""}recordings/`;

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
let activeRecordingUri: string | null = null;

async function ensureDirectory(): Promise<void> {
  if (!RECORDING_STORAGE_DIR) {
    throw new Error("ERROR 101 CONTACT ADMIN");
  }

  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
}

function createRecordingFileUri(): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${RECORDINGS_DIR}${Date.now()}-${suffix}.m4a`;
}

async function moveRecordingToPersistentStorage(sourceUri: string): Promise<string> {
  await ensureDirectory();
  const destinationUri = createRecordingFileUri();

  try {
    await FileSystem.moveAsync({ from: sourceUri, to: destinationUri });
    return destinationUri;
  } catch (moveErr) {
    if (__DEV__) {
      console.warn("[LocalRecording] moveAsync failed, falling back to copy:", moveErr);
    }
    await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
    await FileSystem.deleteAsync(sourceUri, { idempotent: true }).catch(() => void 0);
    return destinationUri;
  }
}

export type LocalRecordingResult = {
  fileUri: string;
  durationMs: number;
  fileSize: number;
  isRecovered?: boolean;
};

async function recoverRecordingAfterStopFailure(
  recording: Audio.Recording,
  fallbackUri: string | null,
): Promise<LocalRecordingResult | null> {
  const uri = recording.getURI() ?? fallbackUri;
  if (!uri) {
    return null;
  }

  const sourceInfo = await FileSystem.getInfoAsync(uri);
  if (!sourceInfo.exists || !sourceInfo.size) {
    return null;
  }

  let fileUri = uri;
  try {
    fileUri = await moveRecordingToPersistentStorage(uri);
  } catch (persistErr) {
    if (__DEV__) {
      console.warn("[LocalRecording] Failed to move recovered file, keeping source URI:", persistErr);
    }
  }

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || !fileInfo.size) {
    return null;
  }

  let durationMs = 0;
  try {
    const status = await recording.getStatusAsync();
    durationMs = status.durationMillis ?? 0;
  } catch {
    durationMs = 0;
  }

  return {
    fileUri,
    durationMs,
    fileSize: fileInfo.size,
    isRecovered: true,
  };
}

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
  activeRecordingUri = recording.getURI();
  if (__DEV__) console.log("[LocalRecording] Recording started, URI:", activeRecordingUri);
}

export async function stopLocalRecording(): Promise<LocalRecordingResult | null> {
  if (!activeRecording) {
    if (__DEV__) console.log("[LocalRecording] stopLocalRecording called but no active recording");
    return null;
  }

  if (__DEV__) console.log("[LocalRecording] Stopping local recording...");
  const recording = activeRecording;
  const fallbackUri = activeRecordingUri ?? recording.getURI();
  activeRecording = null;
  activeRecordingUri = null;

  try {
    await recording.stopAndUnloadAsync();
  } catch (err) {
    if (__DEV__) console.error("[LocalRecording] stopAndUnloadAsync failed:", err);
    const recovered = await recoverRecordingAfterStopFailure(recording, fallbackUri);
    if (__DEV__) {
      if (recovered) {
        console.warn(
          "[LocalRecording] Recovered file after stop failure:",
          recovered.fileUri,
          "size:",
          recovered.fileSize,
          "bytes",
        );
      } else {
        console.warn("[LocalRecording] No recoverable file found after stop failure");
      }
    }
    return recovered;
  } finally {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  }

  const uri = recording.getURI() ?? fallbackUri;
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

  let fileUri = uri;
  try {
    fileUri = await moveRecordingToPersistentStorage(uri);
  } catch (persistErr) {
    if (__DEV__) {
      console.warn("[LocalRecording] Failed to move recording, keeping source URI:", persistErr);
    }
  }

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const fileSize = fileInfo.exists ? fileInfo.size : 0;
  if (__DEV__) console.log("[LocalRecording] File size:", fileSize, "bytes", "uri:", fileUri);

  return { fileUri, durationMs, fileSize, isRecovered: false };
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

export function getRecordingsDirectory(): string {
  return RECORDINGS_DIR;
}

export async function writeRecordingRecovery(
  fileUri: string,
  metadata: object,
): Promise<void> {
  try {
    const recoveryUri = `${fileUri}.recovery.json`;
    await FileSystem.writeAsStringAsync(recoveryUri, JSON.stringify(metadata));
  } catch {
    // Best-effort — don't fail the recording flow
  }
}

export async function deleteRecordingRecovery(fileUri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(`${fileUri}.recovery.json`, { idempotent: true });
  } catch {
    // Best-effort
  }
}
