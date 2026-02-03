import { api } from "@/services/api";
import type { Porte } from "@/types/api";
import { useApiCall } from "./use-api-call";

export function useCommercialActivity(immeubleId?: number) {
  const modified = useApiCall<Porte[]>(
    async () => api.statistics.getPortesModifiedToday(immeubleId),
    [immeubleId],
  );

  const rdvToday = useApiCall<Porte[]>(
    async () => api.statistics.getPortesRdvToday(),
    [],
  );

  return { modified, rdvToday };
}
