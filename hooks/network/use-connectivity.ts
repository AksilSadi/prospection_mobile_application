import { useEffect, useState } from "react";
import {
  ensureConnectivityMonitoring,
  getIsOnline,
  subscribeConnectivity,
} from "@/services/network/connectivity.service";

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(getIsOnline);

  useEffect(() => {
    ensureConnectivityMonitoring();
    return subscribeConnectivity(setIsOnline);
  }, []);

  return { isOnline };
}
