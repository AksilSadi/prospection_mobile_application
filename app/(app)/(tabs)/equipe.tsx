import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Manager, Statistic } from "@/types/api";
import { calculateRank } from "@/utils/business/ranks";
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PeriodKey = "7d" | "30d" | "90d" | "all";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "90d", label: "90j" },
  { key: "all", label: "Tout" },
];

const INITIAL_STATS = {
  contratsSignes: 0,
  immeublesVisites: 0,
  rendezVousPris: 0,
  refus: 0,
  absents: 0,
  argumentes: 0,
  nbImmeublesProspectes: 0,
  nbPortesProspectes: 0,
};

const filterStatsByPeriod = (stats: Statistic[] = [], period: PeriodKey) => {
  if (period === "all") return stats;
  const now = Date.now();
  const days =
    period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 0;
  const start = now - days * 24 * 60 * 60 * 1000;
  return stats.filter((stat) => {
    const dateValue = stat.createdAt || stat.updatedAt;
    if (!dateValue) return false;
    const time = Date.parse(dateValue);
    return time >= start;
  });
};

const sumStats = (stats: Statistic[]) =>
  stats.reduce(
    (acc, stat) => ({
      contratsSignes: acc.contratsSignes + (stat.contratsSignes || 0),
      immeublesVisites: acc.immeublesVisites + (stat.immeublesVisites || 0),
      rendezVousPris: acc.rendezVousPris + (stat.rendezVousPris || 0),
      refus: acc.refus + (stat.refus || 0),
      absents: acc.absents + (stat.absents || 0),
      argumentes: acc.argumentes + (stat.argumentes || 0),
      nbImmeublesProspectes:
        acc.nbImmeublesProspectes + (stat.nbImmeublesProspectes || 0),
      nbPortesProspectes:
        acc.nbPortesProspectes + (stat.nbPortesProspectes || 0),
    }),
    { ...INITIAL_STATS },
  );

export default function EquipeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      if (!isMounted) return;
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
    return () => {
      isMounted = false;
    };
  }, []);

  const { data: profile, loading } = useWorkspaceProfile(userId, role);

  const managerProfile = role === "manager" ? (profile as Manager) : null;
  const team = managerProfile?.commercials || [];

  const teamSnapshots = useMemo(() => {
    return team.map((commercial) => {
      const stats = filterStatsByPeriod(commercial.statistics || [], period);
      const totals = sumStats(stats);
      const { rank, points } = calculateRank(
        totals.contratsSignes,
        totals.rendezVousPris,
        totals.immeublesVisites,
      );
      const zones = commercial.zones || [];
      const immeubles = commercial.immeubles || [];
      return {
        ...commercial,
        stats: totals,
        rank,
        points,
        zoneCount: zones.length,
        immeubleCount: immeubles.length,
      };
    });
  }, [period, team]);

  const teamTotals = useMemo(() => {
    return teamSnapshots.reduce(
      (acc, commercial) => ({
        contratsSignes: acc.contratsSignes + commercial.stats.contratsSignes,
        immeublesVisites:
          acc.immeublesVisites + commercial.stats.immeublesVisites,
        rendezVousPris: acc.rendezVousPris + commercial.stats.rendezVousPris,
        refus: acc.refus + commercial.stats.refus,
        nbImmeublesProspectes:
          acc.nbImmeublesProspectes + commercial.stats.nbImmeublesProspectes,
        nbPortesProspectes:
          acc.nbPortesProspectes + commercial.stats.nbPortesProspectes,
      }),
      { ...INITIAL_STATS },
    );
  }, [teamSnapshots]);

  const topPerformer = useMemo(() => {
    if (!teamSnapshots.length) return null;
    return [...teamSnapshots].sort((a, b) => b.points - a.points)[0];
  }, [teamSnapshots]);

  if (role !== "manager") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.emptyCard}>
          <Feather name="lock" size={28} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Accès manager</Text>
          <Text style={styles.emptyText}>
            Cette page est réservée aux managers.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((option) => {
          const selected = period === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.periodChip, selected && styles.periodChipActive]}
              onPress={() => setPeriod(option.key)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  selected && styles.periodChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.kpiRow}>
        <View style={[styles.kpiCardPrimary, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiIconPrimary}>
            <Feather name="users" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.kpiValuePrimary}>
            {loading ? "—" : teamSnapshots.length}
          </Text>
          <Text style={styles.kpiLabelPrimary}>Effectif</Text>
        </View>
        <View
          style={[styles.kpiCardSecondary, isTablet && styles.kpiCardTablet]}
        >
          <View style={styles.kpiIconSecondary}>
            <Feather name="award" size={18} color="#2563EB" />
          </View>
          <Text style={styles.kpiValueSecondary}>
            {loading ? "—" : teamTotals.contratsSignes}
          </Text>
          <Text style={styles.kpiLabelSecondary}>Contrats signés</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={[styles.kpiCardLight, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiIconLight}>
            <Feather name="calendar" size={18} color="#2563EB" />
          </View>
          <Text style={styles.kpiValueLight}>
            {loading ? "—" : teamTotals.rendezVousPris}
          </Text>
          <Text style={styles.kpiLabelLight}>RDV pris</Text>
        </View>
        <View style={[styles.kpiCardLight, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiIconLight}>
            <Feather name="grid" size={18} color="#0EA5E9" />
          </View>
          <Text style={styles.kpiValueLight}>
            {loading ? "—" : teamTotals.nbPortesProspectes}
          </Text>
          <Text style={styles.kpiLabelLight}>Portes prospectées</Text>
        </View>
      </View>

      {topPerformer ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconGold}>
              <Feather name="trophy" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Top performer</Text>
              <Text style={styles.sectionSubtitle}>Meilleur commercial</Text>
            </View>
          </View>
          <View style={styles.topRow}>
            <View style={styles.topAvatar}>
              <Text style={styles.topInitials}>
                {topPerformer.prenom?.charAt(0)}
                {topPerformer.nom?.charAt(0)}
              </Text>
            </View>
            <View style={styles.topInfo}>
              <Text style={styles.topName}>
                {topPerformer.prenom} {topPerformer.nom}
              </Text>
              <Text style={styles.topMeta}>
                {topPerformer.rank.name} • {topPerformer.points} pts
              </Text>
            </View>
            <View style={styles.topBadge}>
              <Feather name="award" size={14} color="#2563EB" />
              <Text style={styles.topBadgeText}>
                {topPerformer.stats.contratsSignes} contrats
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Feather name="briefcase" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Équipe commerciale</Text>
            <Text style={styles.sectionSubtitle}>
              {teamSnapshots.length} commerciaux
            </Text>
          </View>
        </View>

        {teamSnapshots.length === 0 ? (
          <View style={styles.emptyInline}>
            <Text style={styles.emptyInlineText}>
              Aucun commercial assigné.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {teamSnapshots.map((commercial) => (
              <View key={commercial.id} style={styles.listCard}>
                <View style={styles.listHeader}>
                  <View style={styles.listAvatar}>
                    <Text style={styles.listInitials}>
                      {commercial.prenom?.charAt(0)}
                      {commercial.nom?.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>
                      {commercial.prenom} {commercial.nom}
                    </Text>
                    <Text style={styles.listMeta}>
                      {commercial.zoneCount} zone
                      {commercial.zoneCount > 1 ? "s" : ""} •{" "}
                      {commercial.immeubleCount} immeuble
                      {commercial.immeubleCount > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>
                      {commercial.rank.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.listStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {commercial.stats.contratsSignes}
                    </Text>
                    <Text style={styles.statLabel}>Contrats</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {commercial.stats.rendezVousPris}
                    </Text>
                    <Text style={styles.statLabel}>RDV</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {commercial.stats.nbPortesProspectes}
                    </Text>
                    <Text style={styles.statLabel}>Portes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{commercial.points}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    gap: 16,
  },
  headerBlock: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  periodChipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },
  kpiCardPrimary: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#2563EB",
  },
  kpiCardSecondary: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiCardLight: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kpiCardTablet: {
    minHeight: 120,
  },
  kpiIconPrimary: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIconSecondary: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiIconLight: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValuePrimary: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  kpiLabelPrimary: {
    marginTop: 4,
    fontSize: 13,
    color: "#DBEAFE",
  },
  kpiValueSecondary: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  kpiLabelSecondary: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  kpiValueLight: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  kpiLabelLight: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIconGold: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  topInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  topMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  topBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  topBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  list: {
    gap: 12,
  },
  listCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  listAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  listInitials: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  listMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  rankPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  listStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  emptyCard: {
    margin: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 6,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  emptyInline: {
    alignItems: "center",
    paddingVertical: 8,
  },
  emptyInlineText: {
    fontSize: 12,
    color: "#64748B",
  },
});
