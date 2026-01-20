import { gql } from "@/services/core/graphql";
import type { Commercial } from "@/types/api";
import { GET_COMMERCIAL_FULL } from "./commercial.queries";

export const commercialApi = {
  async getFullById(id: number): Promise<Commercial> {
    const response = await gql<{ commercial: Commercial }, { id: number }>(GET_COMMERCIAL_FULL, {
      id,
    });
    return response.commercial;
  },

};
