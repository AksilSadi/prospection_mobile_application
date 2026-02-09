import { dataSyncService, type DataSyncEventType } from "@/services/sync/data-sync.service";
import { invalidateApiCacheByPrefix } from "./use-api-call";

function invalidateWorkspaceCaches(): void {
  invalidateApiCacheByPrefix("workspace-profile:");
  invalidateApiCacheByPrefix("commercial-activity:");
  invalidateApiCacheByPrefix("commercial-statistics:");
  invalidateApiCacheByPrefix("commercial-timeline:");
}

export function syncWorkspaceMutation(
  eventType: DataSyncEventType,
  options?: { immeubleId?: number; porteId?: number },
): void {
  invalidateWorkspaceCaches();
  dataSyncService.emit({
    type: eventType,
    immeubleId: options?.immeubleId,
    porteId: options?.porteId,
  });
}
