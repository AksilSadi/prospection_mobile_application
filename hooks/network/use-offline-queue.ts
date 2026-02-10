import { useEffect, useState } from "react";
import { subscribeOfflineQueue } from "@/services/offline/offline-queue.service";

export function useOfflineQueueCount() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    return subscribeOfflineQueue(setPendingCount);
  }, []);

  return { pendingCount };
}
