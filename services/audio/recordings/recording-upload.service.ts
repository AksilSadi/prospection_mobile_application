import * as FileSystem from "expo-file-system/legacy";
import { RecordingService } from "./recording.service";
import type {
  RequestRecordingUploadInput,
  RecordingItem,
} from "./recording.types";

export type UploadRecordingInput = {
  fileUri: string;
  roomName: string;
  durationMs: number;
  fileSize: number;
  immeubleId?: number | null;
  participantIdentity?: string | null;
};

export async function uploadRecording(
  input: UploadRecordingInput,
): Promise<RecordingItem> {
  const { fileUri, roomName, durationMs, fileSize, immeubleId, participantIdentity } =
    input;

  if (__DEV__) console.log("[Upload] Starting upload. room:", roomName, "file:", fileUri, "size:", fileSize, "duration:", durationMs, "ms");

  const uploadInput: RequestRecordingUploadInput = {
    roomName,
    immeubleId,
    participantIdentity,
    mimeType: "audio/mp4",
    duration: Math.round(durationMs / 1000),
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
    throw new Error(`S3 upload failed with status ${uploadResult.status}`);
  }

  if (__DEV__) console.log("[Upload] Confirming upload...");
  const confirmed = await RecordingService.confirmRecordingUpload({
    s3Key,
    duration: Math.round(durationMs / 1000),
  });
  if (__DEV__) console.log("[Upload] Confirmed. Deleting local file...");

  await FileSystem.deleteAsync(fileUri, { idempotent: true });
  if (__DEV__) console.log("[Upload] Done. key:", confirmed.key);

  return confirmed;
}
