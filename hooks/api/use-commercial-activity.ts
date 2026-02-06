import { api } from "@/services/api";
import type { Porte } from "@/types/api";
import { useApiCall } from "./use-api-call";

export function useCommercialActivity(immeubleId?: number) {
  const modified = useApiCall<Porte[]>(
    async () => api.statistics.getPortesModifiedToday(immeubleId),
    [immeubleId],
    {
      cacheKey: `commercial-activity:modified:${immeubleId ?? 0}`,
      cacheTimeMs: 20_000,
    },
  );

  const rdvToday = useApiCall<Porte[]>(
    async () => api.statistics.getPortesRdvToday(),
    [],
    {
      cacheKey: "commercial-activity:rdv-today",
      cacheTimeMs: 20_000,
    },
  );

  return { modified, rdvToday };
}
