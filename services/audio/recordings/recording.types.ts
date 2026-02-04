export type RecordingResult = {
  egressId: string;
  roomName: string;
  s3Key: string;
  status: string;
  url?: string | null;
};

export type StartRecordingInput = {
  roomName: string;
  participantIdentity?: string | null;
  immeubleId?: number | null;
  audioOnly?: boolean;
};
