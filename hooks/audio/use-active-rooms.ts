import { useCallback, useState } from "react";
import { AudioMonitoringService } from "@/services/audio";
import type { ActiveRoom, MonitoringSession } from "@/services/audio/monitoring/monitoring.types";
import { useInterval } from "@/hooks/utils/async/use-interval";

export function useActiveRooms(refreshInterval = 5000) {
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [activeSessions, setActiveSessions] = useState<MonitoringSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rooms, sessions] = await Promise.all([
        AudioMonitoringService.getActiveRooms(),
        AudioMonitoringService.getActiveSessions(),
      ]);
      setActiveRooms(rooms || []);
      setActiveSessions(sessions || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Erreur chargement rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useInterval(() => {
    void fetchData();
  }, refreshInterval);

  const isUserOnline = useCallback(
    (userId: number, userType = "commercial") => {
      const userKey = userType === "manager" ? `manager-${userId}` : `commercial-${userId}`;
      return activeRooms.some(room => room.participantNames.includes(userKey));
    },
    [activeRooms]
  );

  const getActiveSessionsForUser = useCallback(
    (userId: number, userType: string) => {
      return activeSessions.filter(
        session => session.userId === userId && session.userType === userType && session.status === "ACTIVE"
      );
    },
    [activeSessions]
  );

  return {
    activeRooms,
    activeSessions,
    loading,
    error,
    isUserOnline,
    getActiveSessionsForUser,
    refetch: fetchData,
  };
}
