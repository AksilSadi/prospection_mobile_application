import { api } from "@/services/api";
import type { TimelinePoint } from "@/types/api";
import { useApiCall } from "./use-api-call";

export function useCommercialTimeline(
  commercialId: number | null,
  startDate?: string,
  endDate?: string,
) {
  return useApiCall<TimelinePoint[]>(
    async () => {
      if (!commercialId || commercialId <= 0) return [];
      return api.statistics.getStatsTimelineByCommercial(
        commercialId,
        startDate,
        endDate,
      );
    },
    [commercialId, startDate, endDate],
    {
      cacheKey: `commercial-timeline:${commercialId ?? 0}:${startDate ?? "none"}:${endDate ?? "none"}`,
      cacheTimeMs: 30_000,
    },
  );
}
