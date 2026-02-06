import { api } from "@/services/api";
import type { Manager } from "@/types/api";
import { useApiCall } from "./use-api-call";

export function useManagers() {
  return useApiCall<Manager[]>(() => api.managers.getAll(), [], {
    cacheKey: "managers:all",
    cacheTimeMs: 120_000,
  });
}
