import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import type { Commercial, Manager } from "@/types/api";
import RankCard from "@/components/dashboard/RankCard";
import StatCard from "@/components/dashboard/StatCard";

export default function DashboardScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const { data: profile, loading, error } = useWorkspaceProfile(userId, role);

  const isManager = role === "manager";
  const stats = useMemo(() => {
    if (!profile) {
      return { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0, refus: 0 };
    }

    const statsArray = isManager
      ? (profile as Manager).personalStatistics || (profile as Manager).statistics || []
      : (profile as Commercial).statistics || [];

    return statsArray.reduce(
      (acc, stat) => ({
        contratsSignes: acc.contratsSignes + (stat.contratsSignes || 0),
        immeublesVisites: acc.immeublesVisites + (stat.immeublesVisites || 0),
        rendezVousPris: acc.rendezVousPris + (stat.rendezVousPris || 0),
        refus: acc.refus + (stat.refus || 0),
      }),
      { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0, refus: 0 }
    );
  }, [profile, isManager]);

  const totalPortesProspectees = useMemo(() => {
    const immeubles = profile?.immeubles || [];
    return immeubles.reduce((total, immeuble) => {
      const portes = immeuble.portes || [];
      const prospectees = portes.filter(porte => porte.statut !== "NON_VISITE").length;
      return total + prospectees;
    }, 0);
  }, [profile]);

  const { rank, points } = useMemo(
    () => calculateRank(stats.contratsSignes, stats.rendezVousPris, stats.immeublesVisites),
    [stats]
  );

  const rankProgress = useMemo(() => {
    const currentIndex = RANKS.findIndex(item => item.name === rank.name);
    const nextRank = RANKS[currentIndex + 1] || null;
    if (!nextRank) {
      return { nextRank: null, progressPercent: 100, pointsNeeded: 0 };
    }
    const pointsInCurrent = points - rank.minPoints;
    const pointsTotal = nextRank.minPoints - rank.minPoints;
    const progressPercent = Math.min((pointsInCurrent / pointsTotal) * 100, 100);
    const pointsNeeded = nextRank.minPoints - points;
    return { nextRank, progressPercent, pointsNeeded };
  }, [rank, points]);

  const immeublesMap = useMemo(() => {
    const map = new Map<number, any>();
    profile?.immeubles?.forEach(imm => map.set(imm.id, imm));
    return map;
  }, [profile]);

  const columns = width >= 900 ? 3 : 2;
  const horizontalPadding = 16;
  const gap = 12;
  const cardWidth = (width - horizontalPadding * 2 - gap * (columns - 1)) / columns;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Tableau de bord</Text>

      {loading && <Text style={styles.helper}>Chargement...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && !error && (
        <>
          <RankCard
            rank={rank}
            points={points}
            nextRank={rankProgress.nextRank}
            progressPercent={rankProgress.progressPercent}
            pointsNeeded={rankProgress.pointsNeeded}
          />


          <View style={styles.statsGrid}>
            <StatCard
              title="Contrats signes"
              value={stats.contratsSignes}
              icon="check-circle"
              style={{ width: cardWidth, alignSelf: "flex-start" }}
            />
            <StatCard
              title="Immeubles visites"
              value={stats.immeublesVisites}
              icon="home"
              style={{ width: cardWidth, alignSelf: "flex-start" }}
            />
            <StatCard
              title="Rendez-vous pris"
              value={stats.rendezVousPris}
              icon="clock"
              style={{ width: cardWidth, alignSelf: "flex-start" }}
            />
            <StatCard
              title="Taux de refus"
              value={
                totalPortesProspectees === 0
                  ? "0%"
                  : `${Math.round((stats.refus / totalPortesProspectees) * 100)}%`
              }
              icon="trending-down"
              style={{ width: cardWidth, alignSelf: "flex-start" }}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  helper: {
    fontSize: 13,
    color: "#64748B",
  },
  error: {
    fontSize: 13,
    color: "#DC2626",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
});
