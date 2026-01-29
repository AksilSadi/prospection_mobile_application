import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import type { Commercial, Manager } from "@/types/api";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

export default function DashboardScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

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
