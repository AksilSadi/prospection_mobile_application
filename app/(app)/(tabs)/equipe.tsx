import { useCommercials } from "@/hooks/api/use-commercials";
import { useApiCall } from "@/hooks/api/use-api-call";
import { useTeamPerformanceTimeline } from "@/hooks/api/use-team-performance-timeline";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import { api } from "@/services/api";
import type { Commercial, Manager, Statistic } from "@/types/api";
import { calculateRank } from "@/utils/business/ranks";
import { Feather } from "@expo/vector-icons";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PeriodKey = "7d" | "30d" | "all";

const PERIOD_OPTIONS: {
  key: PeriodKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}[] = [
  { key: "7d", label: "7j", icon: "calendar" },
  { key: "30d", label: "30j", icon: "clock" },
  { key: "all", label: "Tout", icon: "bar-chart-2" },
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

const DAY_LABELS_SHORT = ["D", "L", "M", "M", "J", "V", "S"];

const getPeriodDays = (period: PeriodKey) => {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  return null;
};

const toDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const filterStatsByPeriod = (stats: Statistic[] = [], period: PeriodKey) => {
  if (period === "all") return stats;

  const now = new Date();
  const end = now.getTime();
  const days = period === "7d" ? 7 : 30;
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const start = startDate.getTime();
  return stats.filter((stat) => {
    const dateValue = stat.createdAt || stat.updatedAt;
    if (!dateValue) return false;
    const time = Date.parse(dateValue);
    return time >= start && time <= end;
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

type TeamSnapshot = Commercial & {
  stats: typeof INITIAL_STATS;
  rank: { name: string };
  points: number;
  zoneCount: number;
  immeubleCount: number;
};

type FeatherIconName = ComponentProps<typeof Feather>["name"];

const getPositionAccent = (
  position: number,
): {
  icon: FeatherIconName;
  bgColor: string;
  iconColor: string;
  textColor: string;
} => {
  if (position === 1) {
    return {
      icon: "award",
      bgColor: "#FCD34D",
      iconColor: "#92400E",
      textColor: "#78350F",
    };
  }
  if (position === 2) {
    return {
      icon: "star",
      bgColor: "#E2E8F0",
      iconColor: "#475569",
      textColor: "#334155",
    };
  }
  if (position === 3) {
    return {
      icon: "shield",
      bgColor: "#F5D0AE",
      iconColor: "#9A3412",
      textColor: "#7C2D12",
    };
  }
  return {
    icon: "hash",
    bgColor: "#E2E8F0",
    iconColor: "#64748B",
    textColor: "#475569",
  };
};

const PeriodFilterChip = memo(function PeriodFilterChip({
  option,
  selected,
  onPress,
}: {
  option: { key: PeriodKey; label: string; icon: keyof typeof Feather.glyphMap };
  selected: boolean;
  onPress: (key: PeriodKey) => void;
}) {
  return (
    <Pressable
      style={[styles.periodChip, selected && styles.periodChipActive]}
      onPress={() => onPress(option.key)}
    >
      <View
        style={[styles.periodChipIconWrap, selected && styles.periodChipIconWrapActive]}
      >
        <Feather
          name={option.icon}
          size={12}
          color={selected ? "#1E3A8A" : "#2563EB"}
        />
      </View>
      <Text
        style={[styles.periodChipText, selected && styles.periodChipTextActive]}
      >
        {option.label}
      </Text>
    </Pressable>
  );
});

const TeamListItem = memo(function TeamListItem({
  commercial,
  position,
}: {
  commercial: TeamSnapshot;
  position: number;
}) {
  const positionAccent = getPositionAccent(position);
  return (
    <View style={styles.listCard}>
        <View style={styles.listHeader}>
        <View
          style={[
            styles.positionBadge,
            { backgroundColor: positionAccent.bgColor },
          ]}
        >
          <Feather
            name={positionAccent.icon}
            size={11}
            color={positionAccent.iconColor}
          />
          <Text style={[styles.positionBadgeText, { color: positionAccent.textColor }]}>
            {position}
          </Text>
        </View>
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
            {commercial.zoneCount > 1 ? "s" : ""} • {commercial.immeubleCount}{" "}
            immeuble
            {commercial.immeubleCount > 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.listHeaderRight}>
          <View style={styles.rankPill}>
            <Text style={styles.rankPillText}>{commercial.rank.name}</Text>
          </View>
          <View style={styles.pointsPill}>
            <Feather name="zap" size={10} color="#B45309" />
            <Text style={styles.pointsPillText}>{commercial.points} pts</Text>
          </View>
        </View>
      </View>
      <View style={styles.listStats}>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Feather name="award" size={10} color="#16A34A" />
          </View>
          <Text style={styles.statValue}>
            {commercial.stats.contratsSignes}
          </Text>
          <Text style={styles.statLabel}>Contrats</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Feather name="calendar" size={10} color="#2563EB" />
          </View>
          <Text style={styles.statValue}>
            {commercial.stats.rendezVousPris}
          </Text>
          <Text style={styles.statLabel}>RDV</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Feather name="grid" size={10} color="#0EA5E9" />
          </View>
          <Text style={styles.statValue}>
            {commercial.stats.nbPortesProspectes}
          </Text>
          <Text style={styles.statLabel}>Portes</Text>
        </View>
        <View style={styles.statItem}>
          <View style={styles.statIconWrap}>
            <Feather name="trending-up" size={10} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{commercial.points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>
    </View>
  );
});

export default function EquipeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0)).current;

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
  const { data: allCommercials, loading: allCommercialsLoading } =
    useCommercials();

  const managerProfile = useMemo(
    () => (role === "manager" ? (profile as Manager | null) : null),
    [profile, role],
  );

  const team = useMemo(() => {
    const assignedFromManager = managerProfile?.commercials ?? [];
    if (assignedFromManager.length > 0) {
      return assignedFromManager;
    }
    if (!userId) {
      return [] as Commercial[];
    }
    return (allCommercials ?? []).filter(
      (commercial) => commercial.managerId === userId,
    );
  }, [allCommercials, managerProfile, userId]);
  const teamCommercialIds = useMemo(
    () => team.map((commercial) => commercial.id),
    [team],
  );

  const periodDays = useMemo(() => getPeriodDays(period), [period]);

  const teamCommercialDetailsCacheKey = useMemo(
    () => `team-commercial-details:${teamCommercialIds.join(",") || "none"}`,
    [teamCommercialIds],
  );

  const fetchTeamCommercialDetails = useCallback(async () => {
    if (!teamCommercialIds.length) return {} as Record<number, Commercial>;
    const settled = await Promise.allSettled(
      teamCommercialIds.map(async (commercialId) =>
        api.commercials.getFullById(commercialId),
      ),
    );

    return settled.reduce<Record<number, Commercial>>((acc, result) => {
      if (result.status === "fulfilled") {
        acc[result.value.id] = result.value;
      }
      return acc;
    }, {});
  }, [teamCommercialIds]);

  const { data: teamCommercialDetails, loading: teamCommercialDetailsLoading } =
    useApiCall<Record<number, Commercial>>(
      fetchTeamCommercialDetails,
      [teamCommercialDetailsCacheKey],
    {
      cacheKey: teamCommercialDetailsCacheKey,
      cacheTimeMs: 45_000,
    },
    );

  const { timelineStartDate, timelineEndDate } = useMemo(() => {
    if (period === "all") {
      return {
        timelineStartDate: undefined,
        timelineEndDate: undefined,
      };
    }

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - ((periodDays ?? 7) - 1));
    start.setHours(0, 0, 0, 0);
    return {
      timelineStartDate: start.toISOString(),
      timelineEndDate: end.toISOString(),
    };
  }, [period, periodDays]);

  const { data: teamTimeline, loading: teamTimelineLoading } =
    useTeamPerformanceTimeline(
      teamCommercialIds,
      timelineStartDate,
      timelineEndDate,
    );
  const isScreenLoading =
    loading ||
    allCommercialsLoading ||
    teamTimelineLoading ||
    teamCommercialDetailsLoading;

  const periodStartKey = useMemo(() => {
    const days = getPeriodDays(period);
    if (!days) return null;
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return toDayKey(start);
  }, [period]);

  const periodEndKey = useMemo(() => toDayKey(new Date()), []);

  const handlePeriodChange = useCallback((nextPeriod: PeriodKey) => {
    setPeriod(nextPeriod);
  }, []);

  const timelineBuckets = useMemo(() => {
    const sorted = (teamTimeline ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) {
      return [] as { date: string; rdvPris: number; contratsSignes: number }[];
    }

    if (period === "all") {
      if (sorted.length <= 30) {
        return sorted;
      }
      const weekSize = 7;
      const weekly: {
        date: string;
        rdvPris: number;
        contratsSignes: number;
      }[] = [];
      for (let i = 0; i < sorted.length; i += weekSize) {
        const chunk = sorted.slice(i, i + weekSize);
        weekly.push({
          date: chunk[Math.floor(chunk.length / 2)]?.date ?? chunk[0].date,
          rdvPris: chunk.reduce((sum, item) => sum + item.rdvPris, 0),
          contratsSignes: chunk.reduce(
            (sum, item) => sum + item.contratsSignes,
            0,
          ),
        });
      }
      return weekly;
    }

    const byDay = new Map(sorted.map((item) => [item.date, item]));
    const effectiveDays = periodDays ?? 7;
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - (effectiveDays - 1));
    return Array.from({ length: effectiveDays }).map((_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = toDayKey(day);
      const point = byDay.get(key);
      return {
        date: key,
        rdvPris: point?.rdvPris ?? 0,
        contratsSignes: point?.contratsSignes ?? 0,
      };
    });
  }, [period, periodDays, teamTimeline]);

  const teamRangeLabel = useMemo(() => {
    if (!timelineBuckets.length) return "—";
    const start = timelineBuckets[0].date;
    const end = timelineBuckets[timelineBuckets.length - 1].date;
    return `${start} - ${end}`;
  }, [timelineBuckets]);

  const teamAxisLabels = useMemo(() => {
    if (!timelineBuckets.length) return [] as string[];
    if (periodDays && periodDays <= 7) {
      return timelineBuckets.map((item) => {
        const d = new Date(`${item.date}T12:00:00`);
        return DAY_LABELS_SHORT[d.getDay()] ?? "";
      });
    }
    return timelineBuckets.map((item, index) => {
      if (
        index === 0 ||
        index === timelineBuckets.length - 1 ||
        index % 5 === 0
      ) {
        return item.date.slice(5);
      }
      return "";
    });
  }, [periodDays, timelineBuckets]);

  const teamChartData = useMemo(() => {
    const rdvData: { value: number; label: string }[] = [];
    const contratsData: { value: number }[] = [];
    for (let index = 0; index < timelineBuckets.length; index += 1) {
      const item = timelineBuckets[index];
      rdvData.push({ value: item.rdvPris, label: teamAxisLabels[index] ?? "" });
      contratsData.push({ value: item.contratsSignes });
    }
    return { rdvData, contratsData };
  }, [teamAxisLabels, timelineBuckets]);

  const teamChartDomain = useMemo(() => {
    const maxVal = Math.max(
      1,
      timelineBuckets.reduce(
        (max, point) => Math.max(max, point.rdvPris, point.contratsSignes),
        0,
      ),
    );
    const roundedMax = maxVal <= 5 ? 6 : Math.ceil(maxVal / 5) * 5;
    return {
      max: roundedMax,
      step: Math.max(1, Math.ceil(roundedMax / 2)),
      labels: [0, Math.max(1, Math.ceil(roundedMax / 2)), roundedMax].map(
        (value) => String(value),
      ),
    };
  }, [timelineBuckets]);

  const performanceChartWidth = useMemo(() => {
    const reserved = isTablet ? 160 : 104;
    return Math.max(220, Math.min(width - reserved, 680));
  }, [isTablet, width]);
  const performanceChartHeight = isTablet ? 220 : 180;
  const performanceChartSpacing = useMemo(
    () =>
      Math.max(
        isTablet ? 18 : 24,
        Math.floor(
          (performanceChartWidth - 96) /
            Math.max(1, teamChartData.rdvData.length - 1),
        ),
      ),
    [isTablet, performanceChartWidth, teamChartData.rdvData.length],
  );

  const teamSnapshots = useMemo<TeamSnapshot[]>(() => {
    return team.map((commercial) => {
      const detailedCommercial = teamCommercialDetails?.[commercial.id] ?? commercial;
      const immeubles = detailedCommercial.immeubles || [];
      const totals = { ...INITIAL_STATS };
      const visitedImmeubles = new Set<number>();

      for (const immeuble of immeubles) {
        for (const porte of immeuble.portes || []) {
          const statut = typeof porte.statut === "string" ? porte.statut : "";
          if (!statut || statut === "NON_VISITE") continue;

          const visitDay = porte.derniereVisite?.slice(0, 10);
          if (period !== "all") {
            if (!visitDay || !periodStartKey) continue;
            if (visitDay < periodStartKey || visitDay > periodEndKey) continue;
          }

          visitedImmeubles.add(immeuble.id);
          totals.nbPortesProspectes = (totals.nbPortesProspectes || 0) + 1;

          if (statut === "CONTRAT_SIGNE") {
            totals.contratsSignes += Math.max(1, porte.nbContrats || 1);
          } else if (statut === "RENDEZ_VOUS_PRIS") {
            totals.rendezVousPris += 1;
          } else if (statut === "REFUS") {
            totals.refus += 1;
          } else if (statut === "ABSENT") {
            totals.absents = (totals.absents || 0) + 1;
          } else if (statut === "ARGUMENTE") {
            totals.argumentes = (totals.argumentes || 0) + 1;
          }
        }
      }

      if ((totals.nbPortesProspectes || 0) === 0) {
        const fallbackStats = filterStatsByPeriod(commercial.statistics || [], period);
        const fallbackTotals = sumStats(fallbackStats);
        Object.assign(totals, fallbackTotals);
      }

      totals.nbImmeublesProspectes = visitedImmeubles.size;
      totals.immeublesVisites = visitedImmeubles.size;
      const { rank, points } = calculateRank(
        totals.contratsSignes,
        totals.rendezVousPris,
        totals.immeublesVisites,
      );
      const zones = detailedCommercial.zones || [];
      return {
        ...detailedCommercial,
        stats: totals,
        rank,
        points,
        zoneCount: zones.length,
        immeubleCount: immeubles.length,
      };
    });
  }, [period, periodEndKey, periodStartKey, team, teamCommercialDetails]);

  const orderedTeamSnapshots = useMemo(
    () =>
      teamSnapshots
        .slice()
        .sort(
          (a, b) =>
            b.points - a.points ||
            b.stats.contratsSignes - a.stats.contratsSignes ||
            b.stats.rendezVousPris - a.stats.rendezVousPris,
        ),
    [teamSnapshots],
  );

  const teamTotals = useMemo(() => {
    return teamSnapshots.reduce(
      (acc, commercial) => ({
        contratsSignes: acc.contratsSignes + commercial.stats.contratsSignes,
        immeublesVisites:
          acc.immeublesVisites + commercial.stats.immeublesVisites,
        rendezVousPris: acc.rendezVousPris + commercial.stats.rendezVousPris,
        refus: acc.refus + commercial.stats.refus,
        absents: acc.absents + commercial.stats.absents,
        argumentes: acc.argumentes + commercial.stats.argumentes,
        nbImmeublesProspectes:
          acc.nbImmeublesProspectes + commercial.stats.nbImmeublesProspectes,
        nbPortesProspectes:
          acc.nbPortesProspectes + commercial.stats.nbPortesProspectes,
      }),
      { ...INITIAL_STATS },
    );
  }, [teamSnapshots]);

  useEffect(() => {
    if (isScreenLoading) {
      contentOpacity.setValue(0);
      return;
    }

    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start();
  }, [contentOpacity, isScreenLoading]);

  useEffect(() => {
    if (!isScreenLoading) {
      skeletonPulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [isScreenLoading, skeletonPulse]);

  if (role === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <View style={styles.emptyCard}>
          <Feather name="loader" size={28} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Chargement</Text>
          <Text style={styles.emptyText}>
            Récupération du profil manager...
          </Text>
        </View>
      </View>
    );
  }

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

  if (isScreenLoading) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.92],
    });

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((option) => (
            <Animated.View
              key={`skeleton-period-${option.key}`}
              style={[styles.skeletonChip, { opacity: skeletonOpacity }]}
            />
          ))}
        </View>

        <View style={[styles.kpiRow, styles.spacingAfterFilters]}>
          <Animated.View
            style={[
              styles.skeletonKpiCard,
              isTablet && styles.kpiCardTablet,
              { opacity: skeletonOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonKpiCard,
              isTablet && styles.kpiCardTablet,
              { opacity: skeletonOpacity },
            ]}
          />
        </View>

        <View style={[styles.kpiRow, styles.spacingAfterFilters]}>
          <Animated.View
            style={[
              styles.skeletonKpiCard,
              isTablet && styles.kpiCardTablet,
              { opacity: skeletonOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonKpiCard,
              isTablet && styles.kpiCardTablet,
              { opacity: skeletonOpacity },
            ]}
          />
        </View>

        <Animated.View
          style={[styles.performanceCard, { opacity: skeletonOpacity }]}
        >
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonChart} />
        </Animated.View>

        <Animated.View
          style={[styles.sectionCard, { opacity: skeletonOpacity }]}
        >
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonListCard} />
          <View style={styles.skeletonListCard} />
        </Animated.View>
      </ScrollView>
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
      <Animated.View style={{ opacity: contentOpacity }}>
        <View style={styles.periodRow}>
          {PERIOD_OPTIONS.map((option) => (
            <PeriodFilterChip
              key={option.key}
              option={option}
              selected={period === option.key}
              onPress={handlePeriodChange}
            />
          ))}
        </View>

        <View style={[styles.kpiRow, styles.compactStackSpacing]}>
          <View
            style={[styles.kpiCardPrimary, isTablet && styles.kpiCardTablet]}
          >
            <View style={styles.kpiIconPrimary}>
              <Feather name="users" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.kpiValuePrimary}>
              {isScreenLoading ? "—" : teamSnapshots.length}
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
              {isScreenLoading ? "—" : teamTotals.contratsSignes}
            </Text>
            <Text style={styles.kpiLabelSecondary}>Contrats signés</Text>
          </View>
        </View>

        <View style={[styles.kpiRow, styles.compactStackSpacing]}>
          <View style={[styles.kpiCardLight, isTablet && styles.kpiCardTablet]}>
            <View style={styles.kpiIconLight}>
              <Feather name="calendar" size={18} color="#2563EB" />
            </View>
            <Text style={styles.kpiValueLight}>
              {isScreenLoading ? "—" : teamTotals.rendezVousPris}
            </Text>
            <Text style={styles.kpiLabelLight}>RDV pris</Text>
          </View>
          <View style={[styles.kpiCardLight, isTablet && styles.kpiCardTablet]}>
            <View style={styles.kpiIconLight}>
              <Feather name="grid" size={18} color="#0EA5E9" />
            </View>
            <Text style={styles.kpiValueLight}>
              {isScreenLoading ? "—" : teamTotals.nbPortesProspectes}
            </Text>
            <Text style={styles.kpiLabelLight}>Portes prospectées</Text>
          </View>
        </View>

        <View style={[styles.performanceCard, styles.sectionSpacing]}>
          <View style={styles.performanceHeader}>
            <View>
              <Text style={styles.performanceTitle}>
                Performance de l&apos;équipe
              </Text>
              <Text style={styles.performanceSubtitle}>{teamRangeLabel}</Text>
            </View>
            <View style={styles.performanceLegendRow}>
              <View style={styles.performanceLegendItem}>
                <View
                  style={[
                    styles.performanceLegendDot,
                    { backgroundColor: "#2563EB" },
                  ]}
                />
                <Text style={styles.performanceLegendText}>RDV pris</Text>
              </View>
              <View style={styles.performanceLegendItem}>
                <View
                  style={[
                    styles.performanceLegendDot,
                    { backgroundColor: "#F59E0B" },
                  ]}
                />
                <Text style={styles.performanceLegendText}>
                  Contrats signés
                </Text>
              </View>
            </View>
          </View>

          {teamChartData.rdvData.length === 0 ? (
            <View style={styles.performanceEmptyState}>
              <Feather name="activity" size={18} color="#94A3B8" />
              <Text style={styles.performanceEmptyText}>
                Aucune donnée de timeline pour cette période.
              </Text>
            </View>
          ) : (
            <View style={styles.performanceChartWrap}>
              <View style={styles.performanceChartClip}>
                <LineChart
                  key={`team-performance-${period}`}
                  data={teamChartData.rdvData}
                  data2={teamChartData.contratsData}
                  height={performanceChartHeight}
                  width={performanceChartWidth}
                  curved
                  thickness={2.5}
                  color="#2563EB"
                  color2="#F59E0B"
                  areaChart
                  startFillColor="rgba(37, 99, 235, 0.12)"
                  endFillColor="rgba(37, 99, 235, 0)"
                  startOpacity={0.15}
                  endOpacity={0}
                  startFillColor2="rgba(245, 158, 11, 0.12)"
                  endFillColor2="rgba(245, 158, 11, 0)"
                  startOpacity2={0.15}
                  endOpacity2={0}
                  maxValue={teamChartDomain.max}
                  noOfSections={2}
                  stepValue={teamChartDomain.step}
                  yAxisLabelWidth={32}
                  yAxisTextStyle={styles.performanceYAxisLabel}
                  yAxisColor="transparent"
                  yAxisThickness={0}
                  xAxisColor="#E2E8F0"
                  xAxisThickness={1}
                  hideRules
                  rulesColor="transparent"
                  yAxisLabelTexts={teamChartDomain.labels}
                  xAxisLabelTextStyle={styles.performanceAxisLabel}
                  showYAxisIndices={false}
                  spacing={performanceChartSpacing}
                  initialSpacing={12}
                  endSpacing={12}
                  isAnimated
                  animateOnDataChange
                  animationDuration={350}
                  dataPointsColor1="#2563EB"
                  dataPointsColor2="#F59E0B"
                  dataPointsRadius1={3}
                  dataPointsRadius2={3}
                  adjustToWidth
                />
              </View>
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, styles.sectionSpacing]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Feather name="briefcase" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Équipe commerciale</Text>
              <Text style={styles.sectionSubtitle}>
                {orderedTeamSnapshots.length} commerciaux
              </Text>
            </View>
          </View>

          {orderedTeamSnapshots.length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>
                Aucun commercial assigné.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {orderedTeamSnapshots.map((commercial, index) => (
                <TeamListItem
                  key={commercial.id}
                  commercial={commercial}
                  position={index + 1}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
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
    gap: 0,
  },
  spacingAfterFilters: {
    marginTop: 14,
  },
  compactStackSpacing: {
    marginTop: 10,
  },
  sectionSpacing: {
    marginTop: 18,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  periodChipIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  periodChipIconWrapActive: {
    backgroundColor: "#DBEAFE",
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
  skeletonChip: {
    height: 30,
    width: 82,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  skeletonKpiCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
  },
  skeletonTitle: {
    width: "42%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  skeletonSubtitle: {
    width: "62%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  skeletonChart: {
    marginTop: 8,
    height: 180,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  skeletonListCard: {
    height: 94,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
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
  performanceCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  performanceSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#94A3B8",
  },
  performanceLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  performanceLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  performanceLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  performanceLegendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  performanceChartWrap: {
    paddingTop: 4,
  },
  performanceChartClip: {
    overflow: "hidden",
    borderRadius: 12,
  },
  performanceYAxisLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },
  performanceAxisLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },
  performanceEmptyState: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  performanceEmptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
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
  listHeaderRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    marginLeft: 6,
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
  pointsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFF7ED",
  },
  pointsPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9A3412",
  },
  positionBadge: {
    minWidth: 44,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 4,
  },
  positionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
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
    gap: 2,
  },
  statIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
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
