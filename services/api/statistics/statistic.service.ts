import { gql } from "@/services/core/graphql";
import type { Porte, Statistic } from "@/types/api";
import {
  GET_PORTES_MODIFIED_TODAY,
  GET_PORTES_RDV_TODAY,
  GET_STATISTICS,
} from "./statistic.queries";

export const statisticApi = {
  async getStatistics(commercialId?: number): Promise<Statistic[]> {
    const response = await gql<
      { statistics: Statistic[] },
      { commercialId?: number }
    >(GET_STATISTICS, { commercialId });
    return response.statistics;
  },

  async getPortesModifiedToday(immeubleId?: number): Promise<Porte[]> {
    const response = await gql<
      { portesModifiedToday: Porte[] },
      { immeubleId?: number }
    >(GET_PORTES_MODIFIED_TODAY, { immeubleId });
    return response.portesModifiedToday;
  },

  async getPortesRdvToday(): Promise<Porte[]> {
    const response = await gql<{ portesRdvToday: Porte[] }>(
      GET_PORTES_RDV_TODAY,
    );
    return response.portesRdvToday;
  },
};
