import { graphqlClient } from "@/services/core/graphql";
import {
  GENERATE_COMMERCIAL_TOKEN,
  GENERATE_MANAGER_TOKEN,
  LOG_AUDIO_EVENT,
} from "./audio.mutations";
import type { LiveKitConnectionDetails } from "./audio.types";

export const audioApi = {
  async generateCommercialToken(commercialId?: number, roomName?: string) {
    const result = await graphqlClient.request<{
      generateCommercialToken: LiveKitConnectionDetails;
    }>(GENERATE_COMMERCIAL_TOKEN, { commercialId, roomName });

    return result.generateCommercialToken;
  },

  async generateManagerToken(managerId?: number, roomName?: string) {
    const result = await graphqlClient.request<{
      generateManagerToken: LiveKitConnectionDetails;
    }>(GENERATE_MANAGER_TOKEN, { managerId, roomName });

    return result.generateManagerToken;
  },

  async logAudioEvent(eventType: string, message: string, details?: string) {
    try {
      const result = await graphqlClient.request<{ logAudioEvent: boolean }>(LOG_AUDIO_EVENT, {
        eventType,
        message,
        details,
      });
      return result.logAudioEvent;
    } catch (error) {
      return false;
    }
  },
};
