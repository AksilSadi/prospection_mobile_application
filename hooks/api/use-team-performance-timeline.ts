import { api } from "@/services/api";
import type { TimelinePoint } from "@/types/api";
import { useMemo } from "react";

import { useApiCall } from "./use-api-call";

export type TeamTimelinePoint = {
  date: string;
  rdvPris: number;
  contratsSignes: number;
};

export function useTeamPerformanceTimeline(
  commercialIds: number[],
  startDate?: string,
  endDate?: string,
) {
  const normalizedIds = useMemo(
    () =>
      Array.from(
        new Set(
          commercialIds
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ).sort((a, b) => a - b),
    [commercialIds],
  );

  return useApiCall<TeamTimelinePoint[]>(
    async () => {
      if (normalizedIds.length === 0) {
        return [];
      }

      const results = await Promise.allSettled(
        normalizedIds.map((commercialId) =>
          api.statistics.getStatsTimelineByCommercial(
            commercialId,
            startDate,
            endDate,
          ),
        ),
      );

      const byDay = new Map<string, TeamTimelinePoint>();

      for (const result of results) {
        if (result.status !== "fulfilled") {
          continue;
        }
        for (const point of result.value as TimelinePoint[]) {
          const dayKey = point.date.slice(0, 10);
          const prev = byDay.get(dayKey);
          if (!prev) {
            byDay.set(dayKey, {
              date: dayKey,
              rdvPris: point.rdvPris || 0,
              contratsSignes: point.contratsSignes || 0,
            });
            continue;
          }

          prev.rdvPris += point.rdvPris || 0;
          prev.contratsSignes += point.contratsSignes || 0;
        }
      }

      return Array.from(byDay.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
    },
    [normalizedIds.join(","), startDate, endDate],
    {
      cacheKey: `commercial-timeline:team:${normalizedIds.join(",")}:${startDate ?? "none"}:${endDate ?? "none"}`,
      cacheTimeMs: 20_000,
    },
  );
}
