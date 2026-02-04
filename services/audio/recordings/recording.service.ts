import { graphqlClient } from "@/services/core/graphql";
import type { RecordingResult, StartRecordingInput } from "./recording.types";

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
}
