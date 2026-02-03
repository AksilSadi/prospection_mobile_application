import { api } from "@/services/api";
import type { Statistic } from "@/types/api";
import { useApiCall } from "./use-api-call";

export function useCommercialStatistics(commercialId: number | null) {
  return useApiCall<Statistic[]>(
    async () => {
      if (!commercialId || commercialId <= 0) return [];
      return api.statistics.getStatistics(commercialId);
    },
    [commercialId],
  );
}
