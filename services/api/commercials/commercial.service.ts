import { gql } from "@/services/core/graphql";
import type { Commercial } from "@/types/api";
import { GET_COMMERCIALS, GET_COMMERCIAL_FULL } from "./commercial.queries";

export const commercialApi = {
  async getAll(): Promise<Commercial[]> {
    const response = await gql<{ commercials: Commercial[] }>(GET_COMMERCIALS);
    return response.commercials;
  },

  async getFullById(id: number): Promise<Commercial> {
    const response = await gql<{ commercial: Commercial }, { id: number }>(GET_COMMERCIAL_FULL, {
      id,
    });
    return response.commercial;
  },

};
