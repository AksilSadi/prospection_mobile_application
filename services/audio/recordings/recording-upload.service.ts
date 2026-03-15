import * as FileSystem from "expo-file-system/legacy";
import { RecordingService } from "./recording.service";
import type {
  RequestRecordingUploadInput,
  RecordingItem,
  DoorSegment,
} from "./recording.types";

export type UploadRecordingInput = {
  fileUri: string;
  roomName: string;
  durationMs: number;
  fileSize: number;
  immeubleId?: number | null;
  participantIdentity?: string | null;
  doorSegments?: DoorSegment[];
};

export async function uploadRecording(
  input: UploadRecordingInput,
): Promise<RecordingItem> {
  const { fileUri, roomName, durationMs, fileSize, immeubleId, participantIdentity } =
    input;
  const durationSeconds = Math.max(1, Math.round(durationMs / 1000));

  if (__DEV__) console.log("[Upload] Starting upload. room:", roomName, "file:", fileUri, "size:", fileSize, "duration:", durationMs, "ms");

  const uploadInput: RequestRecordingUploadInput = {
    roomName,
    immeubleId,
    participantIdentity,
    mimeType: "audio/mp4",
    duration: durationSeconds,
    fileSize,
  };

  if (__DEV__) console.log("[Upload] Requesting presigned URL...");
  const { uploadUrl, s3Key } =
    await RecordingService.requestRecordingUpload(uploadInput);
  if (__DEV__) console.log("[Upload] Got presigned URL. s3Key:", s3Key);

  if (__DEV__) console.log("[Upload] Uploading to S3...");
  const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: "PUT",
    headers: {
      "Content-Type": "audio/mp4",
    },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });
  if (__DEV__) console.log("[Upload] S3 response status:", uploadResult.status);

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`ERROR 102 CONTACT ADMIN`);
  }

  if (__DEV__) console.log("[Upload] Confirming upload...");
  const closedSegments = input.doorSegments
    ?.filter((s): s is DoorSegment & { endTime: number } => s.endTime !== null && s.endTime - s.startTime >= 5)
    ?? [];
  if (__DEV__ && closedSegments.length > 0) {
    console.log("[Upload] Door segments:", closedSegments.length, JSON.stringify(closedSegments));
  }
  const confirmed = await RecordingService.confirmRecordingUpload({
    s3Key,
    duration: durationSeconds,
    doorSegments: closedSegments.length > 0 ? closedSegments : undefined,
  });
  if (__DEV__) console.log("[Upload] Confirmed. Deleting local file...");

  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch (deleteErr) {
    if (__DEV__) console.warn("[Upload] Failed to delete local file (upload succeeded):", deleteErr);
  }
  if (__DEV__) console.log("[Upload] Done. key:", confirmed.key);

  return confirmed;
}
