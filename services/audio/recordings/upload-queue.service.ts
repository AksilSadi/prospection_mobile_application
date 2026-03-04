import * as FileSystem from "expo-file-system/legacy";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";
import type { UploadRecordingInput } from "./recording-upload.service";
import { uploadRecording } from "./recording-upload.service";

type PendingUpload = UploadRecordingInput & {
  id: string;
  createdAt: number;
  retryCount: number;
};

type QueueListener = (count: number) => void;

const QUEUE_FILE = `${FileSystem.cacheDirectory}pending-uploads.json`;
const MAX_RETRIES = 5;

const queue = new Map<string, PendingUpload>();
const listeners = new Set<QueueListener>();
let autoSyncEnabled = false;
let flushing = false;
let loaded = false;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function notifyListeners(): void {
  const count = queue.size;
  listeners.forEach((l) => l(count));
}

async function persist(): Promise<void> {
   try {
     const data = JSON.stringify(Array.from(queue.values()));
     await FileSystem.writeAsStringAsync(QUEUE_FILE, data);
     if (__DEV__) console.log("[UploadQueue] Persisted", queue.size, "item(s) to disk");
   } catch (err) {
     if (__DEV__) console.warn("[UploadQueue] persist failed:", err);
   }
 }

async function loadFromDisk(): Promise<void> {
   if (loaded) return;
   loaded = true;

   if (__DEV__) console.log("[UploadQueue] Loading from disk...");
   try {
     const info = await FileSystem.getInfoAsync(QUEUE_FILE);
     if (!info.exists) {
       if (__DEV__) console.log("[UploadQueue] No queue file on disk");
       return;
     }

     const raw = await FileSystem.readAsStringAsync(QUEUE_FILE);
     const items: PendingUpload[] = JSON.parse(raw);
     if (__DEV__) console.log("[UploadQueue] Found", items.length, "item(s) on disk");

     for (const item of items) {
       const fileInfo = await FileSystem.getInfoAsync(item.fileUri);
       if (fileInfo.exists) {
         queue.set(item.id, item);
         if (__DEV__) console.log("[UploadQueue] Restored:", item.id, "file:", item.fileUri);
       } else {
         if (__DEV__) console.warn("[UploadQueue] File missing, skipping:", item.fileUri);
       }
     }

     if (__DEV__) console.log("[UploadQueue] Loaded", queue.size, "valid item(s)");
     notifyListeners();
   } catch (err) {
     if (__DEV__) console.warn("[UploadQueue] loadFromDisk failed:", err);
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

   if (getIsOnline()) {
     if (__DEV__) console.log("[UploadQueue] Online after enqueue, attempting immediate flush");
     void flushUploadQueue();
   }
 }

async function processOne(item: PendingUpload): Promise<boolean> {
   if (__DEV__) console.log("[UploadQueue] Processing:", item.id, "attempt:", item.retryCount + 1);
   try {
     await uploadRecording(item);
     if (__DEV__) console.log("[UploadQueue] Success:", item.id);
     return true;
   } catch (err) {
     item.retryCount += 1;
     if (__DEV__) console.warn("[UploadQueue] Failed:", item.id, "attempt:", item.retryCount, "/", MAX_RETRIES, "error:", err);
     return false;
   }
 }

export async function flushUploadQueue(): Promise<void> {
   if (__DEV__) console.log("[UploadQueue] flush called. flushing:", flushing, "online:", getIsOnline(), "queueSize:", queue.size);
   if (flushing || !getIsOnline()) return;

   flushing = true;

   try {
     await loadFromDisk();
     if (queue.size === 0) {
       return;
     }

     if (__DEV__) console.log("[UploadQueue] Flushing", queue.size, "item(s)...");

     const entries = Array.from(queue.values());

     for (const entry of entries) {
       if (!getIsOnline()) {
         if (__DEV__) console.log("[UploadQueue] Lost connection, stopping flush");
         break;
       }

       const success = await processOne(entry);

       if (success) {
         queue.delete(entry.id);
         notifyListeners();
       } else if (entry.retryCount >= MAX_RETRIES) {
         if (__DEV__) console.warn("[UploadQueue] Dropping after max retries:", entry.id);
         await FileSystem.deleteAsync(entry.fileUri, { idempotent: true }).catch(() => void 0);
         queue.delete(entry.id);
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

   subscribeConnectivity((isOnline) => {
     if (__DEV__) console.log("[UploadQueue] Connectivity changed: online =", isOnline, "queueSize:", queue.size);
     if (!isOnline) return;
     void flushUploadQueue();
   });

   if (getIsOnline() && queue.size > 0) {
     if (__DEV__) console.log("[UploadQueue] Already online with pending items, flushing now");
     void flushUploadQueue();
   }

   if (__DEV__) console.log("[UploadQueue] Auto-sync enabled. online:", getIsOnline(), "queueSize:", queue.size);
 }
