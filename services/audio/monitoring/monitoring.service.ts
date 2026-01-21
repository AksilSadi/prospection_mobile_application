import { graphqlClient } from "@/services/core/graphql";
import type { ActiveRoom, MonitoringSession, TokenResponse } from "./monitoring.types";

const GENERATE_COMMERCIAL_TOKEN = `
  mutation GenerateCommercialToken($roomName: String) {
    generateCommercialToken(roomName: $roomName) {
      serverUrl
      participantToken
      roomName
      participantName
    }
  }
`;

const GENERATE_MANAGER_TOKEN = `
  mutation GenerateManagerToken($roomName: String) {
    generateManagerToken(roomName: $roomName) {
      serverUrl
      participantToken
      roomName
      participantName
    }
  }
`;

const START_MONITORING = `
  mutation StartMonitoring($userId: Int!, $userType: String!, $roomName: String) {
    startMonitoring(input: { userId: $userId, userType: $userType, roomName: $roomName }) {
      serverUrl
      participantToken
      roomName
      participantName
    }
  }
`;

const STOP_MONITORING = `
  mutation StopMonitoring($input: StopMonitoringInput!) {
    stopMonitoring(input: $input)
  }
`;

const GET_ACTIVE_SESSIONS = `
  query GetActiveSessions {
    getActiveSessions {
      id
      userId
      userType
      roomName
      status
      startedAt
      supervisorId
    }
  }
`;

const GET_ACTIVE_ROOMS = `
  query GetActiveRooms {
    getActiveRooms {
      roomName
      numParticipants
      createdAt
      participantNames
    }
  }
`;

export class AudioMonitoringService {
  static async generateCommercialToken(roomName?: string): Promise<TokenResponse> {
    const data = await graphqlClient.request(GENERATE_COMMERCIAL_TOKEN, { roomName });
    return data.generateCommercialToken;
  }

  static async generateManagerToken(roomName?: string): Promise<TokenResponse> {
    const data = await graphqlClient.request(GENERATE_MANAGER_TOKEN, { roomName });
    return data.generateManagerToken;
  }

  static async generateUserToken(userType: string, roomName?: string): Promise<TokenResponse> {
    return userType === "manager"
      ? this.generateManagerToken(roomName)
      : this.generateCommercialToken(roomName);
  }

  static async startMonitoring(
    userId: number,
    userType: string,
    roomName?: string
  ): Promise<TokenResponse> {
    const data = await graphqlClient.request(START_MONITORING, {
      userId,
      userType,
      roomName,
    });
    return data.startMonitoring;
  }

  static async stopMonitoring(sessionId: string): Promise<boolean> {
    const data = await graphqlClient.request(STOP_MONITORING, { input: { sessionId } });
    return data.stopMonitoring;
  }

  static async getActiveSessions(): Promise<MonitoringSession[]> {
    const data = await graphqlClient.request(GET_ACTIVE_SESSIONS);
    return data.getActiveSessions;
  }

  static async getActiveRooms(): Promise<ActiveRoom[]> {
    const data = await graphqlClient.request(GET_ACTIVE_ROOMS);
    return data.getActiveRooms;
  }
}
