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

export type RequestRecordingUploadInput = {
  roomName: string;
  immeubleId?: number | null;
  participantIdentity?: string | null;
  mimeType?: string;
  duration?: number | null;
  fileSize?: number | null;
};

export type RecordingUploadDetails = {
  uploadUrl: string;
  s3Key: string;
  expiresIn: number;
};

export type ConfirmRecordingUploadInput = {
  s3Key: string;
  duration?: number | null;
  doorSegments?: DoorSegment[];
};

export type RecordingItem = {
  key: string;
  url?: string | null;
  size?: number | null;
  lastModified?: string | null;
};

export type DoorSegment = {
  porteId: number;
  numero: string;
  etage: number;
  startTime: number;
  endTime: number | null;
  statut?: string | null;
};

export type LocalRecordingState = {
  isRecording: boolean;
  isUploading: boolean;
  fileUri: string | null;
  durationMs: number;
};
