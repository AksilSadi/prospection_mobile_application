import { api } from "@/services/api";
import type { Commercial, Manager } from "@/types/api";
import { useApiCall } from "./use-api-call";

type WorkspaceProfile = Commercial | Manager;

export function useWorkspaceProfile(userId: number | null, role: string | null) {
  return useApiCall<WorkspaceProfile | null>(
    async () => {
      if (!userId || userId <= 0) return null;
      if (role === "manager") {
        return api.managers.getPersonalById(userId);
      }
      return api.commercials.getFullById(userId);
    },
    [userId, role]
  );
}
