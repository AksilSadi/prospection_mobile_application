import * as FileSystem from "expo-file-system/legacy";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  isConnectivityInitialized,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";
import { getRecordingsDirectory } from "./local-recording.service";
import type { UploadRecordingInput } from "./recording-upload.service";
import { uploadRecording } from "./recording-upload.service";

type PendingUpload = UploadRecordingInput & {
  id: string;
  createdAt: number;
  retryCount: number;
  failedAt?: number;
  lastError?: string;
};

type QueueListener = (count: number) => void;

const STORAGE_DIRECTORY = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
const QUEUE_FILE = STORAGE_DIRECTORY ? `${STORAGE_DIRECTORY}pending-uploads.json` : null;
const QUEUE_FILE_TMP = STORAGE_DIRECTORY ? `${STORAGE_DIRECTORY}pending-uploads.json.tmp` : null;
const LEGACY_QUEUE_FILE =
  FileSystem.cacheDirectory &&
  STORAGE_DIRECTORY &&
  STORAGE_DIRECTORY !== FileSystem.cacheDirectory
    ? `${FileSystem.cacheDirectory}pending-uploads.json`
    : null;
const MAX_RETRIES = 5;
const FAILED_ITEM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const queue = new Map<string, PendingUpload>();
const listeners = new Set<QueueListener>();
let autoSyncEnabled = false;
let flushing = false;
let loaded = false;
let loadingPromise: Promise<void> | null = null;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function notifyListeners(): void {
  const count = queue.size;
  listeners.forEach((l) => l(count));
}

async function persist(): Promise<void> {
  if (!QUEUE_FILE || !QUEUE_FILE_TMP) {
    if (__DEV__) console.warn("[UploadQueue] No writable directory available to persist queue");
    return;
  }

  try {
    const data = JSON.stringify(Array.from(queue.values()));
    await FileSystem.writeAsStringAsync(QUEUE_FILE_TMP, data);
    await FileSystem.moveAsync({
      from: QUEUE_FILE_TMP,
      to: QUEUE_FILE,
    });
    if (__DEV__) console.log("[UploadQueue] Persisted", queue.size, "item(s) to disk");
  } catch (err) {
    if (__DEV__) console.warn("[UploadQueue] persist failed:", err);
  }
}

function isPendingUpload(item: unknown): item is PendingUpload {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<PendingUpload>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.fileUri === "string" &&
    typeof candidate.roomName === "string" &&
    typeof candidate.durationMs === "number" &&
    typeof candidate.fileSize === "number" &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.retryCount === "number"
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err ?? "Unknown error");
}

async function loadFromDisk(): Promise<void> {
  if (loaded) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    if (!QUEUE_FILE) {
      loaded = true;
      if (__DEV__) console.warn("[UploadQueue] No writable directory available to load queue");
      return;
    }

    if (__DEV__) console.log("[UploadQueue] Loading from disk...");

    let queueFileToRead = QUEUE_FILE;
    let migrateLegacyQueue = false;

    try {
      const info = await FileSystem.getInfoAsync(queueFileToRead);
      if (!info.exists && LEGACY_QUEUE_FILE) {
        const legacyInfo = await FileSystem.getInfoAsync(LEGACY_QUEUE_FILE);
        if (legacyInfo.exists) {
          queueFileToRead = LEGACY_QUEUE_FILE;
          migrateLegacyQueue = true;
          if (__DEV__) {
            console.log("[UploadQueue] Using legacy queue file for migration:", LEGACY_QUEUE_FILE);
          }
        }
      }

      const fileToReadInfo = await FileSystem.getInfoAsync(queueFileToRead);
      if (!fileToReadInfo.exists) {
        loaded = true;
        if (__DEV__) console.log("[UploadQueue] No queue file on disk");
        return;
      }

      const raw = await FileSystem.readAsStringAsync(queueFileToRead);
      const parsedItems: unknown = JSON.parse(raw);
      if (!Array.isArray(parsedItems)) {
        throw new Error("Queue file is not an array");
      }

      if (__DEV__) console.log("[UploadQueue] Found", parsedItems.length, "item(s) on disk");

      for (const rawItem of parsedItems) {
        if (!isPendingUpload(rawItem)) {
          if (__DEV__) console.warn("[UploadQueue] Invalid queue item skipped");
          continue;
        }

        const item: PendingUpload = {
          ...rawItem,
          retryCount: Math.max(0, rawItem.retryCount),
        };

        if (item.failedAt && Date.now() - item.failedAt > FAILED_ITEM_TTL_MS) {
          if (__DEV__) console.log("[UploadQueue] Removing expired failed item:", item.id);
          await FileSystem.deleteAsync(item.fileUri, { idempotent: true }).catch(() => void 0);
          continue;
        }

        const fileInfo = await FileSystem.getInfoAsync(item.fileUri);
        if (!fileInfo.exists) {
          if (__DEV__) console.warn("[UploadQueue] File missing, skipping:", item.fileUri);
          continue;
        }

        queue.set(item.id, item);
        if (__DEV__) console.log("[UploadQueue] Restored:", item.id, "file:", item.fileUri);
      }

      loaded = true;

      if (migrateLegacyQueue) {
        await persist();
        await FileSystem.deleteAsync(queueFileToRead, { idempotent: true }).catch(() => void 0);
        if (__DEV__) {
          console.log("[UploadQueue] Legacy queue migrated to:", QUEUE_FILE);
        }
      }

      if (__DEV__) console.log("[UploadQueue] Loaded", queue.size, "valid item(s)");
      notifyListeners();
    } catch (err) {
      if (__DEV__) console.warn("[UploadQueue] loadFromDisk failed:", err);
      await FileSystem.deleteAsync(queueFileToRead, { idempotent: true }).catch(() => void 0);
      loaded = false;
    } finally {
      loadingPromise = null;
    }
  })();

  await loadingPromise;
}

async function recoverOrphanedRecordings(): Promise<void> {
  try {
    const dir = getRecordingsDirectory();
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(dir);
    const recoveryFiles = files.filter((f) => f.endsWith(".recovery.json"));

    for (const recoveryFile of recoveryFiles) {
      const recoveryPath = `${dir}${recoveryFile}`;
      const audioPath = recoveryPath.replace(".recovery.json", "");

      const audioInfo = await FileSystem.getInfoAsync(audioPath);
      if (!audioInfo.exists || !audioInfo.size) {
        await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
        continue;
      }

      const alreadyQueued = Array.from(queue.values()).some((item) => item.fileUri === audioPath);
      if (alreadyQueued) {
        await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
        continue;
      }

      try {
        const raw = await FileSystem.readAsStringAsync(recoveryPath);
        const meta = JSON.parse(raw) as Record<string, unknown>;

        if (typeof meta.roomName !== "string" || typeof meta.durationMs !== "number") {
          await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
          continue;
        }

        const audioSize = audioInfo.exists && audioInfo.size ? audioInfo.size : 0;

        const pending: PendingUpload = {
          fileUri: audioPath,
          roomName: meta.roomName as string,
          durationMs: meta.durationMs as number,
          fileSize: typeof meta.fileSize === "number" ? meta.fileSize : audioSize,
          immeubleId: typeof meta.immeubleId === "number" ? meta.immeubleId : undefined,
          participantIdentity: typeof meta.participantIdentity === "string" ? meta.participantIdentity : undefined,
          id: generateId(),
          createdAt: Date.now(),
          retryCount: 0,
        };

        queue.set(pending.id, pending);
        await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);

        if (__DEV__) console.log("[UploadQueue] Recovered orphaned recording:", audioPath);
      } catch (parseErr) {
        if (__DEV__) console.warn("[UploadQueue] Failed to parse recovery file:", recoveryPath, parseErr);
        await FileSystem.deleteAsync(recoveryPath, { idempotent: true }).catch(() => void 0);
      }
    }
  } catch (err) {
    if (__DEV__) console.warn("[UploadQueue] recoverOrphanedRecordings failed:", err);
  }
}

export function subscribeUploadQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  listener(queue.size);
  return () => {
    listeners.delete(listener);
  };
}

export function getUploadQueueCount(): number {
  return queue.size;
}

export async function enqueueUpload(input: UploadRecordingInput): Promise<void> {
  if (__DEV__) console.log("[UploadQueue] Enqueueing upload. file:", input.fileUri, "room:", input.roomName);
  ensureConnectivityMonitoring();
  await loadFromDisk();

  const pending: PendingUpload = {
    ...input,
    id: generateId(),
    createdAt: Date.now(),
    retryCount: 0,
  };

  queue.set(pending.id, pending);
  await persist();
  notifyListeners();

  if (__DEV__) console.log("[UploadQueue] Enqueued:", pending.id, "queue size:", queue.size);

  if (isConnectivityInitialized() && getIsOnline()) {
    if (__DEV__) console.log("[UploadQueue] Online after enqueue, attempting immediate flush");
    void flushUploadQueue();
  }
}

async function processOne(item: PendingUpload): Promise<boolean> {
  if (__DEV__) console.log("[UploadQueue] Processing:", item.id, "attempt:", item.retryCount + 1);
  try {
    await uploadRecording(item);
    item.lastError = undefined;
    if (__DEV__) console.log("[UploadQueue] Success:", item.id);
    return true;
  } catch (err) {
    item.retryCount += 1;
    item.lastError = getErrorMessage(err);
    if (__DEV__) {
      console.warn(
        "[UploadQueue] Failed:",
        item.id,
        "attempt:",
        item.retryCount,
        "/",
        MAX_RETRIES,
        "error:",
        item.lastError,
      );
    }
    return false;
  }
}

export async function flushUploadQueue(): Promise<void> {
  if (flushing) return;

  ensureConnectivityMonitoring();
  await loadFromDisk();

  if (__DEV__) {
    console.log(
      "[UploadQueue] flush called. online:",
      getIsOnline(),
      "ready:",
      isConnectivityInitialized(),
      "queueSize:",
      queue.size,
    );
  }

  if (!isConnectivityInitialized() || !getIsOnline() || queue.size === 0) {
    return;
  }

  flushing = true;

  try {
    if (__DEV__) console.log("[UploadQueue] Flushing", queue.size, "item(s)...");

    const entries = Array.from(queue.values());

    for (const entry of entries) {
      if (entry.failedAt) {
        continue;
      }

      if (!getIsOnline()) {
        if (__DEV__) console.log("[UploadQueue] Lost connection, stopping flush");
        break;
      }

      const success = await processOne(entry);

      if (success) {
        queue.delete(entry.id);
        notifyListeners();
      } else if (entry.retryCount >= MAX_RETRIES) {
        entry.failedAt = Date.now();
        if (__DEV__) {
          console.warn("[UploadQueue] Marked as failed after max retries:", entry.id);
        }
        notifyListeners();
      }
    }

    await persist();
    if (__DEV__) console.log("[UploadQueue] Flush done. Remaining:", queue.size);
  } finally {
    flushing = false;
  }
}

export async function enableUploadQueueAutoSync(): Promise<void> {
  if (autoSyncEnabled) return;
  autoSyncEnabled = true;

  if (__DEV__) console.log("[UploadQueue] Enabling auto-sync...");
  ensureConnectivityMonitoring();
  await loadFromDisk();
  await recoverOrphanedRecordings();
  await persist();

  subscribeConnectivity((isOnline) => {
    if (__DEV__) {
      console.log("[UploadQueue] Connectivity changed: online =", isOnline, "queueSize:", queue.size);
    }
    if (!isOnline) return;
    void flushUploadQueue();
  });

  if (isConnectivityInitialized() && getIsOnline() && queue.size > 0) {
    if (__DEV__) console.log("[UploadQueue] Already online with pending items, flushing now");
    void flushUploadQueue();
  }

  if (__DEV__) {
    console.log(
      "[UploadQueue] Auto-sync enabled. online:",
      getIsOnline(),
      "ready:",
      isConnectivityInitialized(),
      "queueSize:",
      queue.size,
    );
  }
}
