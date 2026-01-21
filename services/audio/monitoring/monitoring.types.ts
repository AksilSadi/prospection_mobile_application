export type TokenResponse = {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  participantName: string;
};

export type MonitoringSession = {
  id: string;
  userId: number;
  userType: string;
  roomName: string;
  status: string;
  startedAt: string;
  supervisorId: number;
};

export type ActiveRoom = {
  roomName: string;
  numParticipants: number;
  createdAt: string;
  participantNames: string[];
};
