import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useCommercialTimeline } from "@/hooks/api/use-commercial-timeline";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import type { Commercial, Manager, TimelinePoint } from "@/types/api";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

export default function DashboardScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [period, setPeriod] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const { data: profile, loading } = useWorkspaceProfile(userId, role);
  const commercialId = role === "commercial" ? userId : null;
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { startDate, endDate } = useMemo(() => {
    const days = period === "30d" ? 30 : 7;
    const end = new Date(`${todayKey}T23:59:59.999Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [period, todayKey]);
  const { data: timeline, loading: loadingTimeline } = useCommercialTimeline(
    commercialId,
    startDate,
    endDate,
  );

  const isManager = role === "manager";
  const stats = useMemo(() => {
    if (!profile) {
      return { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0 };
    }

    const statsArray = isManager
      ? (profile as Manager).personalStatistics || (profile as Manager).statistics || []
      : (profile as Commercial).statistics || [];

    return statsArray.reduce(
      (acc, stat) => ({
        contratsSignes: acc.contratsSignes + (stat.contratsSignes || 0),
        immeublesVisites: acc.immeublesVisites + (stat.immeublesVisites || 0),
        rendezVousPris: acc.rendezVousPris + (stat.rendezVousPris || 0),
      }),
      { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0 }
    );
  }, [profile, isManager]);

  const rankInfo = useMemo(() => {
    const result = calculateRank(stats.contratsSignes, stats.rendezVousPris, stats.immeublesVisites);
    const currentRankIndex = RANKS.findIndex((r) => r.name === result.rank.name);
    const nextRank = RANKS[currentRankIndex + 1];
    const isMaxRank = !nextRank;

    let progressPercent = 0;
    let pointsToNext = 0;

    if (nextRank) {
      const pointsInCurrent = result.points - result.rank.minPoints;
      const pointsTotal = nextRank.minPoints - result.rank.minPoints;
      progressPercent = Math.min((pointsInCurrent / pointsTotal) * 100, 100);
      pointsToNext = nextRank.minPoints - result.points;
    }

    return {
      ...result,
      name: result.rank.name,
      isMaxRank,
      progressPercent,
      pointsToNext,
      nextRank,
    };
  }, [stats]);

  const currentRankIndex = RANKS.findIndex((r) => r.name === rankInfo.name);
  const nextRank = RANKS[currentRankIndex + 1];

  const timelineBuckets = useMemo(() => {
    const days = period === "30d" ? 30 : 7;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));

    const byDay = new Map<string, TimelinePoint>();
    (timeline || []).forEach((point) => {
      const dayKey = point.date.slice(0, 10);
      byDay.set(dayKey, point);
    });

    const items: Array<{
      date: string;
      rdvPris: number;
      portes: number;
    }> = [];

    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const point = byDay.get(key);
      items.push({
        date: key,
        rdvPris: point?.rdvPris || 0,
        portes: point?.portesProspectees || 0,
      });
    }
    return items;
  }, [period, timeline]);

  const maxRdv = Math.max(1, ...timelineBuckets.map((item) => item.rdvPris));
  const maxPortes = Math.max(1, ...timelineBuckets.map((item) => item.portes));

  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  const handleOpenInfo = () => {
    bottomSheetRef.current?.snapToIndex(0);
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Rank Card - Compact */}
        <View style={styles.mainCard}>
          {/* Rank Header */}
          <View style={styles.rankHeader}>
            <View style={styles.rankBadge}>
              <Feather name="award" size={24} color="#F59E0B" />
            </View>
            <View style={styles.rankInfo}>
              <Text style={styles.rankTitle}>{rankInfo.name}</Text>
              <Text style={styles.rankPoints}>{rankInfo.points} points</Text>
            </View>
            <Pressable style={styles.infoButton} onPress={handleOpenInfo}>
              <Feather name="info" size={18} color="#2563EB" />
            </Pressable>
            {rankInfo.isMaxRank && <Feather name="check-circle" size={20} color="#10B981" />}
          </View>

          {/* Progress Bar */}
          {!rankInfo.isMaxRank && nextRank && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Prochain rang</Text>
                <Text style={styles.nextRankName}>{nextRank.name}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${rankInfo.progressPercent}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{rankInfo.pointsToNext} points restants</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionTitle}>Activité</Text>
              <Text style={styles.sectionSubtitle}>
                RDV pris & portes prospectées par jour
              </Text>
            </View>
            <View style={styles.periodRow}>
              <Pressable
                style={[styles.periodChip, period === "7d" && styles.periodChipActive]}
                onPress={() => setPeriod("7d")}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    period === "7d" && styles.periodChipTextActive,
                  ]}
                >
                  7j
                </Text>
              </Pressable>
              <Pressable
                style={[styles.periodChip, period === "30d" && styles.periodChipActive]}
                onPress={() => setPeriod("30d")}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    period === "30d" && styles.periodChipTextActive,
                  ]}
                >
                  30j
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#2563EB" }]} />
              <Text style={styles.legendLabel}>RDV pris</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.legendLabel}>Portes prospectées</Text>
            </View>
          </View>

          <View style={styles.chartRow}>
            {timelineBuckets.map((item, index) => (
              <View key={item.date} style={styles.chartItem}>
                <View style={styles.chartBars}>
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${Math.max(12, (item.rdvPris / maxRdv) * 100)}%`,
                        backgroundColor: "#2563EB",
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.chartBar,
                      {
                        height: `${Math.max(12, (item.portes / maxPortes) * 100)}%`,
                        backgroundColor: "#10B981",
                      },
                    ]}
                  />
                </View>
                {period === "7d" ? (
                  <Text style={styles.chartLabel}>{index + 1}</Text>
                ) : (
                  <Text style={styles.chartLabel}>
                    {item.date.slice(8, 10)}
                  </Text>
                )}
              </View>
            ))}
            {loadingTimeline && (
              <Text style={styles.chartHelper}>Chargement…</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Info Bottom Sheet */}
      <BottomSheet ref={bottomSheetRef} snapPoints={["40%"]} enablePanDownToClose index={-1}>
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Feather name="info" size={20} color="#2563EB" />
            <Text style={styles.sheetTitle}>Calcul des points</Text>
          </View>
          <View style={styles.formulaGrid}>
            <View style={styles.formulaItem}>
              <View style={[styles.formulaIcon, { backgroundColor: "#ECFDF5" }]}>
                <Feather name="check-circle" size={16} color="#10B981" />
              </View>
              <Text style={styles.formulaItemLabel}>Contrat signé</Text>
              <Text style={styles.formulaItemValue}>100 pts</Text>
            </View>
            <View style={styles.formulaItem}>
              <View style={[styles.formulaIcon, { backgroundColor: "#F5F3FF" }]}>
                <Feather name="calendar" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.formulaItemLabel}>RDV pris</Text>
              <Text style={styles.formulaItemValue}>20 pts</Text>
            </View>
            <View style={styles.formulaItem}>
              <View style={[styles.formulaIcon, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="home" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.formulaItemLabel}>Immeuble visité</Text>
              <Text style={styles.formulaItemValue}>5 pts</Text>
            </View>
          </View>
          <Text style={styles.formulaNote}>
            Votre rang est calculé en fonction de ces actions. Plus vous êtes actif, plus vous gagnez de points !
          </Text>
        </BottomSheetView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  periodRow: {
    flexDirection: "row",
    gap: 6,
  },
  periodChip: {
    paddingHorizontal: 10,
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
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
  },
  legendRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12,
    minHeight: 140,
  },
  chartItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 110,
    width: "100%",
    justifyContent: "center",
  },
  chartBar: {
    width: 8,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },
  chartHelper: {
    fontSize: 11,
    color: "#94A3B8",
    marginLeft: 8,
  },
  rankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFBEB",
    borderWidth: 3,
    borderColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  rankInfo: {
    flex: 1,
  },
  rankTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  rankPoints: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
  },
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  nextRankName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  formulaGrid: {
    gap: 12,
    marginBottom: 20,
  },
  formulaItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  formulaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  formulaItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    flex: 1,
  },
  formulaItemValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  formulaNote: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 10,
  },
});
