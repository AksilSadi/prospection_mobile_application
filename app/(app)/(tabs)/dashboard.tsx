import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Commercial, Manager } from "@/types/api";
import { calculateRank, RANKS } from "@/utils/business/ranks";
import { Feather } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";

const SCREEN_WIDTH = Dimensions.get("window").width;

type WeeklyData = {
  day: string;
  doors: number;
};

// Simple custom bar chart component
function SimpleBarChart({
  data,
  color = "#2563EB",
}: {
  data: WeeklyData[];
  color?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.doors), 1);

  return (
    <View style={styles.chartContainer}>
      {data.map((item, index) => {
        const barHeight = (item.doors / maxValue) * 140;
        return (
          <View key={index} style={styles.barColumn}>
            <View style={styles.barValueContainer}>
              <Text style={[styles.barValue, { color }]}>{item.doors}</Text>
            </View>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  { height: barHeight, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.dayLabel}>{item.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function DashboardScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const chartScrollRef = useRef<GestureScrollView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const conversionSheetRef = useRef<BottomSheet>(null);

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
      ? (profile as Manager).personalStatistics ||
        (profile as Manager).statistics ||
        []
      : (profile as Commercial).statistics || [];

    return statsArray.reduce(
      (acc, stat) => ({
        contratsSignes: acc.contratsSignes + (stat.contratsSignes || 0),
        immeublesVisites: acc.immeublesVisites + (stat.immeublesVisites || 0),
        rendezVousPris: acc.rendezVousPris + (stat.rendezVousPris || 0),
      }),
      { contratsSignes: 0, immeublesVisites: 0, rendezVousPris: 0 },
    );
  }, [profile, isManager]);

  const rankInfo = useMemo(() => {
    const result = calculateRank(
      stats.contratsSignes,
      stats.rendezVousPris,
      stats.immeublesVisites,
    );
    const currentRankIndex = RANKS.findIndex(
      (r) => r.name === result.rank.name,
    );
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

  // Calculate weekly data from real backend data
  const { weeklyData, weeklyContracts, conversionRate } = useMemo(() => {
    if (!profile) {
      return {
        weeklyData: [],
        weeklyContracts: [],
        conversionRate: "0.0",
      };
    }

    const immeubles = isManager
      ? (profile as Manager).immeubles || []
      : (profile as Commercial).immeubles || [];

    // Get all doors from all buildings
    const allDoors = immeubles.flatMap((immeuble) => immeuble.portes || []);

    // Get dates for the last 7 days
    const today = new Date();
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split("T")[0],
        dayName: dayNames[date.getDay()],
      };
    });

    // Count doors visited per day
    const doorsPerDay = last7Days.map(({ date, dayName }) => {
      const count = allDoors.filter((door) => {
        if (!door.derniereVisite) return false;
        const visitDate = door.derniereVisite.split("T")[0];
        return visitDate === date;
      }).length;
      return { day: dayName, doors: count };
    });

    // Count doors with contracts (nbContrats > 0)
    // Note: We don't have contract dates, so we show total contracts per building visited each day
    const contractsPerDay = last7Days.map(({ date, dayName }) => {
      const doorsVisited = allDoors.filter((door) => {
        if (!door.derniereVisite) return false;
        const visitDate = door.derniereVisite.split("T")[0];
        return visitDate === date;
      });
      const contractCount = doorsVisited.filter(
        (door) => (door.nbContrats || 0) > 0,
      ).length;
      return { day: dayName, doors: contractCount };
    });

    // Calculate conversion rate
    const totalDoors = doorsPerDay.reduce((sum, d) => sum + d.doors, 0);
    const totalContracts = contractsPerDay.reduce((sum, d) => sum + d.doors, 0);
    const rate =
      totalDoors > 0 ? ((totalContracts / totalDoors) * 100).toFixed(1) : "0.0";

    return {
      weeklyData: doorsPerDay,
      weeklyContracts: contractsPerDay,
      conversionRate: rate,
    };
  }, [profile, isManager]);

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

  const handleOpenConversionInfo = () => {
    conversionSheetRef.current?.snapToIndex(0);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
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
            {rankInfo.isMaxRank && (
              <Feather name="check-circle" size={20} color="#10B981" />
            )}
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
                  style={[
                    styles.progressFill,
                    { width: `${rankInfo.progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {rankInfo.pointsToNext} points restants
              </Text>
            </View>
          )}
        </View>

        {/* Charts Slider */}
        <View style={styles.chartCard}>
          <GestureScrollView
            ref={chartScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const scrollPosition = event.nativeEvent.contentOffset.x;
              const index = Math.round(scrollPosition / (SCREEN_WIDTH - 52));
              setActiveChartIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {/* Weekly Prospection Chart */}
            <View style={[styles.chartSlide, { width: SCREEN_WIDTH - 72 }]}>
              <View style={styles.chartHeader}>
                <Feather name="bar-chart-2" size={20} color="#2563EB" />
                <Text style={styles.chartTitle}>
                  Portes prospectées cette semaine
                </Text>
              </View>
              <SimpleBarChart data={weeklyData} />
            </View>

            {/* Weekly Contracts Chart */}
            <View style={[styles.chartSlide, { width: SCREEN_WIDTH - 72 }]}>
              <View style={styles.chartHeader}>
                <Feather name="file-text" size={20} color="#10B981" />
                <View style={styles.chartTitleContainer}>
                  <Text style={styles.chartTitle}>
                    Contrats signés cette semaine
                  </Text>
                  <View style={styles.conversionContainer}>
                    <View style={styles.conversionBadge}>
                      <Text style={styles.conversionRate}>
                        {conversionRate}%
                      </Text>
                      <Text style={styles.conversionLabel}>
                        taux conversion
                      </Text>
                    </View>
                    <Pressable
                      style={styles.conversionInfoButton}
                      onPress={handleOpenConversionInfo}
                    >
                      <Feather name="help-circle" size={16} color="#059669" />
                    </Pressable>
                  </View>
                </View>
              </View>
              <SimpleBarChart data={weeklyContracts} color="#10B981" />
            </View>
          </GestureScrollView>

          {/* Pagination Indicators */}
          <View style={styles.paginationContainer}>
            {[0, 1].map((index) => (
              <Pressable
                key={index}
                onPress={() => {
                  chartScrollRef.current?.scrollTo({
                    x: index * (SCREEN_WIDTH - 72),
                    animated: true,
                  });
                }}
                style={[
                  styles.paginationDot,
                  activeChartIndex === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Info Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["40%"]}
        enablePanDownToClose
        index={-1}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Feather name="info" size={20} color="#2563EB" />
            <Text style={styles.sheetTitle}>Calcul des points</Text>
          </View>
          <View style={styles.formulaGrid}>
            <View style={styles.formulaItem}>
              <View
                style={[styles.formulaIcon, { backgroundColor: "#ECFDF5" }]}
              >
                <Feather name="check-circle" size={16} color="#10B981" />
              </View>
              <Text style={styles.formulaItemLabel}>Contrat signé</Text>
              <Text style={styles.formulaItemValue}>100 pts</Text>
            </View>
            <View style={styles.formulaItem}>
              <View
                style={[styles.formulaIcon, { backgroundColor: "#F5F3FF" }]}
              >
                <Feather name="calendar" size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.formulaItemLabel}>RDV pris</Text>
              <Text style={styles.formulaItemValue}>20 pts</Text>
            </View>
            <View style={styles.formulaItem}>
              <View
                style={[styles.formulaIcon, { backgroundColor: "#EFF6FF" }]}
              >
                <Feather name="home" size={16} color="#3B82F6" />
              </View>
              <Text style={styles.formulaItemLabel}>Immeuble visité</Text>
              <Text style={styles.formulaItemValue}>5 pts</Text>
            </View>
          </View>
          <Text style={styles.formulaNote}>
            Votre rang est calculé en fonction de ces actions. Plus vous êtes
            actif, plus vous gagnez de points !
          </Text>
        </BottomSheetView>
      </BottomSheet>

      {/* Conversion Rate Explanation Bottom Sheet */}
      <BottomSheet
        ref={conversionSheetRef}
        snapPoints={["35%"]}
        enablePanDownToClose
        index={-1}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Feather name="help-circle" size={20} color="#10B981" />
            <Text style={styles.sheetTitle}>Taux de conversion</Text>
          </View>
          <View style={styles.explanationCard}>
            <Text style={styles.explanationTitle}>
              Comment est-il calculé ?
            </Text>
            <Text style={styles.explanationText}>
              Le taux de conversion mesure l'efficacité de votre prospection.
            </Text>
            <View style={styles.formulaBox}>
              <Text style={styles.formulaText}>
                (Portes avec contrats ÷ Portes visitées) × 100
              </Text>
            </View>
            <Text style={styles.explanationExample}>
              <Text style={styles.boldText}>Exemple :</Text> Si vous visitez 100
              portes et signez 13 contrats, votre taux est de 13%.
            </Text>
            <View style={styles.performanceIndicators}>
              <View style={styles.performanceItem}>
                <View
                  style={[
                    styles.performanceDot,
                    { backgroundColor: "#10B981" },
                  ]}
                />
                <Text style={styles.performanceText}>
                  {">"} 20% = Excellent
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <View
                  style={[
                    styles.performanceDot,
                    { backgroundColor: "#F59E0B" },
                  ]}
                />
                <Text style={styles.performanceText}>10-20% = Bon</Text>
              </View>
              <View style={styles.performanceItem}>
                <View
                  style={[
                    styles.performanceDot,
                    { backgroundColor: "#EF4444" },
                  ]}
                />
                <Text style={styles.performanceText}>
                  {"<"} 10% = À améliorer
                </Text>
              </View>
            </View>
          </View>
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
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 40,
    padding: 20,
    marginTop: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chartSlide: {
    paddingHorizontal: 0,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: "#2563EB",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  chartTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conversionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conversionBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  conversionRate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  conversionLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#059669",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  conversionInfoButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 180,
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barValueContainer: {
    height: 24,
    justifyContent: "center",
    marginBottom: 4,
  },
  barValue: {
    fontSize: 11,
    fontWeight: "700",
  },
  barWrapper: {
    width: "100%",
    paddingHorizontal: 4,
    height: 140,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 8,
  },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 200,
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
  explanationCard: {
    gap: 16,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  formulaBox: {
    backgroundColor: "#F0FDF4",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  formulaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#059669",
    textAlign: "center",
  },
  explanationExample: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },
  performanceIndicators: {
    gap: 8,
    marginTop: 8,
  },
  performanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  performanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  performanceText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
});
