import { graphqlClient } from "@/services/core/graphql";
import type {
  RecordingResult,
  StartRecordingInput,
  RequestRecordingUploadInput,
  RecordingUploadDetails,
  ConfirmRecordingUploadInput,
  RecordingItem,
} from "./recording.types";

const START_RECORDING = `
  mutation StartRecording($input: StartRecordingInput!) {
    startRecording(input: $input) {
      egressId
      roomName
      s3Key
      status
      url
    }
  }
`;

const STOP_RECORDING = `
  mutation StopRecording($input: StopRecordingInput!) {
    stopRecording(input: $input)
  }
`;

const REQUEST_RECORDING_UPLOAD = `
  mutation RequestRecordingUpload($input: RequestRecordingUploadInput!) {
    requestRecordingUpload(input: $input) {
      uploadUrl
      s3Key
      expiresIn
    }
  }
`;

const CONFIRM_RECORDING_UPLOAD = `
  mutation ConfirmRecordingUpload($input: ConfirmRecordingUploadInput!) {
    confirmRecordingUpload(input: $input) {
      key
      url
      size
      lastModified
    }
  }
`;

export class RecordingService {
  static async startRecording(input: StartRecordingInput): Promise<RecordingResult> {
    const data = await graphqlClient.request<{ startRecording: RecordingResult }>(
      START_RECORDING,
      { input },
    );
    return data.startRecording;
  }

  static async stopRecording(egressId: string): Promise<boolean> {
    const data = await graphqlClient.request<{ stopRecording: boolean }>(
      STOP_RECORDING,
      { input: { egressId } },
    );
    return data.stopRecording;
  }

  static async requestRecordingUpload(
    input: RequestRecordingUploadInput,
  ): Promise<RecordingUploadDetails> {
    const data = await graphqlClient.request<{
      requestRecordingUpload: RecordingUploadDetails;
    }>(REQUEST_RECORDING_UPLOAD, { input });
    return data.requestRecordingUpload;
  }

  static async confirmRecordingUpload(
    input: ConfirmRecordingUploadInput,
  ): Promise<RecordingItem> {
    const data = await graphqlClient.request<{
      confirmRecordingUpload: RecordingItem;
    }>(CONFIRM_RECORDING_UPLOAD, { input });
    return data.confirmRecordingUpload;
  }
}
