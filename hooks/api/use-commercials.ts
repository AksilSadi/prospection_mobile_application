import { api } from "@/services/api";
import type { Commercial } from "@/types/api";
import { useApiCall } from "./use-api-call";

export function useCommercials() {
  return useApiCall<Commercial[]>(() => api.commercials.getAll(), [], {
    cacheKey: "commercials:all",
    cacheTimeMs: 120_000,
  });
}
