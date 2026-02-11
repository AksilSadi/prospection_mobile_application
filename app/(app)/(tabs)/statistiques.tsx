import { useCommercialTimeline } from "@/hooks/api/use-commercial-timeline";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import { dataSyncService } from "@/services/sync/data-sync.service";
import type { TimelinePoint } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Pie, PolarChart } from "victory-native";

const DAY_LABELS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const PERIOD_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: "7 j" },
  { days: 30, label: "30 j" },
  { days: 90, label: "90 j" },
];

type RdvItem = {
  porteId: number;
  immeubleId: number;
  adresse: string;
  numero: string;
  nomPersonnalise?: string;
  etage: number;
  statut: string;
  rdvDate: string;
  rdvTime?: string;
  commentaire?: string;
};

type StatistiquesScreenProps = {
  onNavigateToImmeuble?: (immeubleId: number) => void;
};

const MONTH_NAMES = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

export default function StatistiquesScreen({
  onNavigateToImmeuble,
}: StatistiquesScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(7);
  const [chartKey, setChartKey] = useState(0);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const skeletonPulse = useRef(new Animated.Value(0)).current;
  const wasFocusedRef = useRef(false);
  const shouldRefetchOnFocusRef = useRef(false);

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

  const commercialId = role === "commercial" ? userId : null;
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const maxDays = 90;
  const { startDate, endDate } = useMemo(() => {
    const end = new Date(`${todayKey}T23:59:59.999Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (maxDays - 1));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [todayKey]);
  const startKey = useMemo(() => {
    const end = new Date(`${todayKey}T12:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - (periodDays - 1));
    return start.toISOString().slice(0, 10);
  }, [todayKey, periodDays]);
  const {
    data: timelineData,
    loading: timelineLoading,
    refetch: refetchTimeline,
  } = useCommercialTimeline(commercialId, startDate, endDate);
  const workspaceState = useWorkspaceProfile(userId, role);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(todayKey);

  const allRdvPortes = useMemo<RdvItem[]>(() => {
    const items: RdvItem[] = [];
    const immeubles = workspaceState.data?.immeubles ?? [];
    for (const imm of immeubles) {
      for (const porte of imm.portes ?? []) {
        if (porte.rdvDate) {
          items.push({
            porteId: porte.id,
            immeubleId: imm.id,
            adresse: imm.adresse,
            numero: porte.numero,
            nomPersonnalise: porte.nomPersonnalise ?? undefined,
            etage: porte.etage,
            statut: typeof porte.statut === "string" ? porte.statut : "",
            rdvDate: porte.rdvDate,
            rdvTime: porte.rdvTime ?? undefined,
            commentaire: porte.commentaire ?? undefined,
          });
        }
      }
    }
    return items.sort((a, b) => {
      const dc = a.rdvDate.localeCompare(b.rdvDate);
      if (dc !== 0) return dc;
      return (a.rdvTime ?? "").localeCompare(b.rdvTime ?? "");
    });
  }, [workspaceState.data]);

  const weekDays = useMemo(() => {
    const today = new Date(`${todayKey}T12:00:00`);
    const dow = today.getDay();
    const mondayDelta = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDelta + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [todayKey, weekOffset]);

  const weekLabel = useMemo(() => {
    if (!weekDays.length) return "";
    const s = weekDays[0];
    const e = weekDays[6];
    const sd = new Date(`${s}T12:00:00`);
    const ed = new Date(`${e}T12:00:00`);
    const sDay = String(sd.getDate()).padStart(2, "0");
    const eDay = String(ed.getDate()).padStart(2, "0");
    const sMonth = MONTH_NAMES[sd.getMonth()] ?? "";
    const eMonth = MONTH_NAMES[ed.getMonth()] ?? "";
    if (sMonth === eMonth) return `${sDay} - ${eDay} ${sMonth}`;
    return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
  }, [weekDays]);

  const rdvByDay = useMemo(() => {
    const map = new Map<string, RdvItem[]>();
    for (const item of allRdvPortes) {
      const dayKey = item.rdvDate.slice(0, 10);
      const arr = map.get(dayKey) ?? [];
      arr.push(item);
      map.set(dayKey, arr);
    }
    return map;
  }, [allRdvPortes]);

  const selectedDayRdvs = useMemo(
    () => rdvByDay.get(selectedDay) ?? [],
    [rdvByDay, selectedDay],
  );

  useEffect(() => {
    if (weekDays.includes(selectedDay)) return;
    const firstWithRdv = weekDays.find((d) => rdvByDay.has(d));
    setSelectedDay(firstWithRdv ?? weekDays[0] ?? todayKey);
  }, [weekDays, selectedDay, rdvByDay, todayKey]);

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (
        event.type !== "IMMEUBLE_CREATED" &&
        event.type !== "IMMEUBLE_UPDATED" &&
        event.type !== "IMMEUBLE_DELETED" &&
        event.type !== "PORTE_CREATED" &&
        event.type !== "PORTE_UPDATED" &&
        event.type !== "PORTE_DELETED"
      ) {
        return;
      }

      if (!commercialId) {
        return;
      }

      if (isFocused) {
        void workspaceState.refetch();
        void refetchTimeline();
        return;
      }

      shouldRefetchOnFocusRef.current = true;
    });

    return unsubscribe;
  }, [commercialId, isFocused, workspaceState, refetchTimeline]);

  useEffect(() => {
    if (commercialId) {
      return;
    }
    shouldRefetchOnFocusRef.current = false;
  }, [commercialId]);

  useEffect(() => {
    if (!isFocused) {
      wasFocusedRef.current = false;
      return;
    }
    if (wasFocusedRef.current) {
      return;
    }

    wasFocusedRef.current = true;
    setChartKey((prev) => prev + 1);

    if (!commercialId || !shouldRefetchOnFocusRef.current) {
      return;
    }

    shouldRefetchOnFocusRef.current = false;
    void workspaceState.refetch();
    void refetchTimeline();
  }, [commercialId, isFocused, workspaceState, refetchTimeline]);

  const filteredKpi = useMemo(() => {
    const immeubles = workspaceState.data?.immeubles ?? [];
    let portes = 0;
    let rdvCount = 0;
    let contratsCount = 0;
    let refusCount = 0;
    let absentsCount = 0;
    const immeublesSet = new Set<number>();

    for (const imm of immeubles) {
      for (const porte of imm.portes ?? []) {
        const st = typeof porte.statut === "string" ? porte.statut : "";
        if (st === "NON_VISITE") continue;
        const dv = porte.derniereVisite?.slice(0, 10);
        if (!dv || dv < startKey || dv > todayKey) continue;
        portes += 1;
        immeublesSet.add(imm.id);
        if (st === "RENDEZ_VOUS_PRIS") rdvCount += 1;
        if (st === "CONTRAT_SIGNE") contratsCount += 1;
        if (st === "REFUS") refusCount += 1;
        if (st === "ABSENT") absentsCount += 1;
      }
    }

    return {
      portes,
      immeubles: immeublesSet.size,
      rdv: rdvCount,
      contrats: contratsCount,
      refus: refusCount,
      absents: absentsCount,
    };
  }, [workspaceState.data, startKey, todayKey]);

  const isLoading = workspaceState.loading || timelineLoading;

  useEffect(() => {
    if (!isLoading) {
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
  }, [isLoading, skeletonPulse]);

  const { realRdvByDay, realContratsByDay } = useMemo(() => {
    const rdvMap = new Map<string, number>();
    const contratsMap = new Map<string, number>();
    const immeubles = workspaceState.data?.immeubles ?? [];
    for (const imm of immeubles) {
      for (const porte of imm.portes ?? []) {
        const st = typeof porte.statut === "string" ? porte.statut : "";
        const dateKey = porte.derniereVisite?.slice(0, 10);
        if (!dateKey) continue;
        if (st === "RENDEZ_VOUS_PRIS") {
          rdvMap.set(dateKey, (rdvMap.get(dateKey) ?? 0) + 1);
        }
        if (st === "CONTRAT_SIGNE") {
          contratsMap.set(dateKey, (contratsMap.get(dateKey) ?? 0) + 1);
        }
      }
    }
    return { realRdvByDay: rdvMap, realContratsByDay: contratsMap };
  }, [workspaceState.data]);

  const timelineBuckets = useMemo(() => {
    const end = new Date(`${todayKey}T00:00:00.000Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (periodDays - 1));

    const byDay = new Map<string, TimelinePoint>();
    (timelineData || []).forEach((point) => {
      const key = point.date.slice(0, 10);
      byDay.set(key, point);
    });

    const daily = Array.from({ length: periodDays }).map((_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      const key = d.toISOString().slice(0, 10);
      const point = byDay.get(key);
      return {
        date: key,
        rdvPris: realRdvByDay.get(key) ?? (point?.rdvPris || 0),
        portes: point?.portesProspectees || 0,
        contrats: realContratsByDay.get(key) ?? (point?.contratsSignes || 0),
      };
    });

    if (periodDays <= 30) return daily;

    const weekSize = 7;
    const weeks: typeof daily = [];
    for (let i = 0; i < daily.length; i += weekSize) {
      const chunk = daily.slice(i, i + weekSize);
      const sum = { portes: 0, rdvPris: 0, contrats: 0 };
      for (const d of chunk) {
        sum.portes += d.portes;
        sum.rdvPris += d.rdvPris;
        sum.contrats += d.contrats;
      }
      weeks.push({
        date: chunk[Math.floor(chunk.length / 2)].date,
        portes: sum.portes,
        rdvPris: sum.rdvPris,
        contrats: sum.contrats,
      });
    }
    return weeks;
  }, [timelineData, todayKey, periodDays, realRdvByDay, realContratsByDay]);

  const chartWidth = Math.min(width - 40, 520);
  const pieSize = 240;
  const pieRenderSize = Math.min(chartWidth, pieSize);
  const formatDayLabel = useCallback((dateKey: string, withMonth = false) => {
    const date = new Date(`${dateKey}T00:00:00`);
    const day = String(date.getDate()).padStart(2, "0");
    if (!withMonth) return day;
    const month = MONTH_NAMES[date.getMonth()] ?? "";
    return `${day} ${month}`;
  }, []);

  const pieData = useMemo(() => {
    const base = [
      { label: "Contrats", value: filteredKpi.contrats, color: "#2563EB" },
      { label: "RDV", value: filteredKpi.rdv, color: "#10B981" },
      { label: "Refus", value: filteredKpi.refus, color: "#F59E0B" },
      { label: "Absents", value: filteredKpi.absents, color: "#EF4444" },
    ];
    const total = base.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return [{ label: "Aucune", value: 1, color: "#E2E8F0" }];
    }
    return base;
  }, [filteredKpi]);

  const hasPieData = useMemo(
    () => pieData.some((item) => item.label !== "Aucune"),
    [pieData],
  );

  const piePercentages = useMemo(() => {
    const total = pieData.reduce((sum, item) => sum + item.value, 0);
    return pieData.map((item) => ({
      ...item,
      percent: total ? Math.round((item.value / total) * 100) : 0,
    }));
  }, [pieData]);

  const axisLabels = useMemo(() => {
    if (!timelineBuckets.length) return [];
    const total = timelineBuckets.length;
    const dayLetters = ["D", "L", "M", "M", "J", "V", "S"];

    if (periodDays <= 7) {
      return timelineBuckets.map((item) => {
        const day = new Date(`${item.date}T00:00:00`).getDay();
        return dayLetters[day];
      });
    }

    if (periodDays <= 30) {
      return timelineBuckets.map((item, i) => {
        if (i === 0 || i === total - 1 || i % 5 === 0) {
          const d = new Date(`${item.date}T00:00:00`);
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        }
        return "";
      });
    }

    return timelineBuckets.map((item) => {
      const d = new Date(`${item.date}T00:00:00`);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
  }, [timelineBuckets, periodDays]);

  const chartDomain = useMemo(() => {
    const maxVal = Math.max(
      1,
      timelineBuckets.reduce(
        (m, item) => Math.max(m, item.portes, item.rdvPris, item.contrats),
        0,
      ),
    );
    const exponent = Math.floor(Math.log10(maxVal));
    const base = maxVal / Math.pow(10, exponent);
    const stepBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    const step = stepBase * Math.pow(10, exponent);
    const roundedMax = Math.max(step * 2, Math.ceil(maxVal / step) * step);
    const yStep = Math.max(1, Math.round(roundedMax / 2));
    return {
      max: roundedMax,
      step: yStep,
      labels: [roundedMax, yStep, 0].map((v) => String(v)),
    };
  }, [timelineBuckets]);

  const rangeLabel = useMemo(() => {
    if (!timelineBuckets.length) return "—";
    const start = formatDayLabel(timelineBuckets[0].date, true);
    const end = formatDayLabel(
      timelineBuckets[timelineBuckets.length - 1].date,
      true,
    );
    return `${start} - ${end}`;
  }, [formatDayLabel, timelineBuckets]);

  const { portesChartData, rdvChartData, contratsChartData } = useMemo(() => {
    const portes: { value: number; label: string }[] = [];
    const rdvPoints: { value: number }[] = [];
    const contratsPoints: { value: number }[] = [];

    for (let index = 0; index < timelineBuckets.length; index += 1) {
      const item = timelineBuckets[index];
      const label = axisLabels[index] ?? "";
      portes.push({ value: item.portes, label });
      rdvPoints.push({ value: item.rdvPris });
      contratsPoints.push({ value: item.contrats });
    }

    return {
      portesChartData: portes,
      rdvChartData: rdvPoints,
      contratsChartData: contratsPoints,
    };
  }, [axisLabels, timelineBuckets]);

  const chartSpacing = useMemo(
    () =>
      Math.max(
        28,
        Math.floor((chartWidth - 80) / Math.max(1, portesChartData.length - 1)),
      ),
    [chartWidth, portesChartData.length],
  );

  useEffect(() => {
    if (isLoading) {
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
  }, [contentOpacity, isLoading]);

  if (isLoading) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    });

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.kpiGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Animated.View
              key={`kpi-skeleton-${index}`}
              style={[styles.kpiCard, { opacity: skeletonOpacity }]}
            >
              <View style={styles.kpiSkeletonTop} />
              <View style={styles.kpiSkeletonValue} />
              <View style={styles.kpiSkeletonHint} />
            </Animated.View>
          ))}
        </View>

        {Array.from({ length: 5 }).map((_, index) => (
          <Animated.View
            key={`section-skeleton-${index}`}
            style={[
              styles.sectionCard,
              styles.sectionCardTopSpacing,
              { opacity: skeletonOpacity },
            ]}
          >
            <View style={styles.sectionSkeletonTitle} />
            <View style={styles.sectionSkeletonSubtitle} />
            <View style={styles.sectionSkeletonChart} />
          </Animated.View>
        ))}
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
      <View style={styles.overviewCard}>
        <View style={styles.overviewHeader}>
          <View>
            <Text style={styles.overviewTitle}>Vue d'ensemble</Text>
            <Text style={styles.overviewSubtitle}>{rangeLabel}</Text>
          </View>
          <View style={styles.segmentedControl}>
            {PERIOD_OPTIONS.map((opt) => (
              <Pressable
                key={opt.days}
                style={[styles.segmentBtn, periodDays === opt.days && styles.segmentBtnActive]}
                onPress={() => { setPeriodDays(opt.days); setChartKey((k) => k + 1); }}
              >
                <Text style={[styles.segmentText, periodDays === opt.days && styles.segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Immeubles</Text>
              <View style={styles.kpiIcon}>
                <Feather name="home" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>
              {isLoading ? "--" : filteredKpi.immeubles}
            </Text>
            <Text style={styles.kpiHint}>Prospectés</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Portes</Text>
              <View style={styles.kpiIcon}>
                <Feather name="grid" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>
              {isLoading ? "--" : filteredKpi.portes}
            </Text>
            <Text style={styles.kpiHint}>Prospectées</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>RDV pris</Text>
              <View style={styles.kpiIcon}>
                <Feather name="calendar" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{isLoading ? "--" : filteredKpi.rdv}</Text>
            <Text style={styles.kpiHint}>Rendez-vous</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Contrats</Text>
              <View style={styles.kpiIcon}>
                <Feather name="award" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{isLoading ? "--" : filteredKpi.contrats}</Text>
            <Text style={styles.kpiHint}>Signés</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Refus</Text>
              <View style={styles.kpiIcon}>
                <Feather name="x-circle" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{isLoading ? "--" : filteredKpi.refus}</Text>
            <Text style={styles.kpiHint}>Interactions</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Absents</Text>
              <View style={styles.kpiIcon}>
                <Feather name="user-x" size={18} color="#2563EB" />
              </View>
            </View>
            <Text style={styles.kpiValue}>{isLoading ? "--" : filteredKpi.absents}</Text>
            <Text style={styles.kpiHint}>Non rencontrés</Text>
          </View>
        </View>

        <View style={styles.overviewDivider} />

        <View style={styles.chartSection}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartHeaderTitle}>Activité / jour</Text>
            <View style={styles.chartLegendRow}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: "#2563EB" }]} />
                <Text style={styles.chartLegendText}>Portes</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: "#10B981" }]} />
                <Text style={styles.chartLegendText}>RDV</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.chartLegendDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.chartLegendText}>Contrats</Text>
              </View>
            </View>
          </View>
          <View style={styles.giftedChartWrap}>
            <LineChart
              key={`activity-chart-${chartKey}`}
              data={portesChartData}
              data2={rdvChartData}
              data3={contratsChartData}
              curved
              thickness={2.5}
              color="#2563EB"
              color2="#10B981"
              color3="#F59E0B"
              areaChart
              startFillColor="rgba(37, 99, 235, 0.12)"
              endFillColor="rgba(37, 99, 235, 0)"
              startOpacity={0.15}
              endOpacity={0}
              startFillColor2="rgba(16, 185, 129, 0.12)"
              endFillColor2="rgba(16, 185, 129, 0)"
              startOpacity2={0.15}
              endOpacity2={0}
              startFillColor3="rgba(245, 158, 11, 0.12)"
              endFillColor3="rgba(245, 158, 11, 0)"
              startOpacity3={0.15}
              endOpacity3={0}
              maxValue={chartDomain.max}
              noOfSections={2}
              stepValue={chartDomain.step}
              yAxisLabelWidth={32}
              yAxisTextStyle={styles.yAxisLabel}
              yAxisColor="transparent"
              yAxisThickness={0}
              xAxisColor="#E2E8F0"
              xAxisThickness={1}
              hideRules
              rulesColor="transparent"
              yAxisLabelTexts={chartDomain.labels}
              xAxisLabelTextStyle={styles.axisLabel}
              showYAxisIndices={false}
              isAnimated
              animateOnDataChange
              animationDuration={350}
              spacing={chartSpacing}
              initialSpacing={12}
              endSpacing={12}
              dataPointsColor1="#2563EB"
              dataPointsColor2="#10B981"
              dataPointsColor3="#F59E0B"
              dataPointsRadius1={3}
              dataPointsRadius2={3}
              dataPointsRadius3={3}
            />
          </View>
        </View>
      </View>

      <View style={[styles.sectionCard, styles.sectionCardTopSpacing]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Rendez-vous</Text>
            <Text style={styles.sectionSubtitle}>{weekLabel}</Text>
          </View>
          <View style={styles.weekNav}>
            <Pressable onPress={() => setWeekOffset((w) => w - 1)} style={styles.weekNavBtn}>
              <Feather name="chevron-left" size={18} color="#2563EB" />
            </Pressable>
            {weekOffset !== 0 && (
              <Pressable onPress={() => { setWeekOffset(0); setSelectedDay(todayKey); }} style={styles.weekNavBtn}>
                <Feather name="rotate-ccw" size={14} color="#2563EB" />
              </Pressable>
            )}
            <Pressable onPress={() => setWeekOffset((w) => w + 1)} style={styles.weekNavBtn}>
              <Feather name="chevron-right" size={18} color="#2563EB" />
            </Pressable>
          </View>
        </View>

        <View style={styles.dayPillRow}>
          {weekDays.map((day) => {
            const isToday = day === todayKey;
            const isSelected = day === selectedDay;
            const hasRdv = rdvByDay.has(day);
            const d = new Date(`${day}T12:00:00`);
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.dayPill,
                  isSelected && styles.dayPillActive,
                  isToday && !isSelected && styles.dayPillToday,
                ]}
              >
                <Text style={[styles.dayPillLabel, isSelected && styles.dayPillLabelActive]}>
                  {DAY_LABELS_SHORT[d.getDay()]}
                </Text>
                <Text style={[styles.dayPillDate, isSelected && styles.dayPillDateActive]}>
                  {String(d.getDate()).padStart(2, "0")}
                </Text>
                {hasRdv ? (
                  <View style={[styles.dayPillDot, isSelected && styles.dayPillDotActive]} />
                ) : (
                  <View style={styles.dayPillDotSpacer} />
                )}
              </Pressable>
            );
          })}
        </View>

        {selectedDayRdvs.length === 0 ? (
          <View style={styles.rdvEmpty}>
            <Feather name="calendar" size={28} color="#CBD5E1" />
            <Text style={styles.rdvEmptyText}>Aucun rendez-vous</Text>
          </View>
        ) : (
          <View style={styles.rdvList}>
            {selectedDayRdvs.map((item) => (
              <Pressable
                key={`${item.porteId}-${item.rdvDate}`}
                style={styles.rdvCard}
                onPress={() => onNavigateToImmeuble?.(item.immeubleId)}
              >
                <View style={styles.rdvTimeCol}>
                  <View style={styles.rdvTimeBadge}>
                    <Feather name="clock" size={11} color="#2563EB" />
                    <Text style={styles.rdvTimeText}>{item.rdvTime || "--:--"}</Text>
                  </View>
                </View>
                <View style={styles.rdvInfoCol}>
                  <Text style={styles.rdvPorteLabel} numberOfLines={1}>
                    Porte {item.numero}{item.nomPersonnalise ? ` · ${item.nomPersonnalise}` : ""}
                  </Text>
                  <Text style={styles.rdvEtageLabel}>
                    {item.etage === 0 ? "RDC" : `${item.etage}${item.etage === 1 ? "er" : "ème"} étage`}
                  </Text>
                  <View style={styles.rdvAddressRow}>
                    <Feather name="map-pin" size={11} color="#94A3B8" />
                    <Text style={styles.rdvAddressText} numberOfLines={1}>{item.adresse}</Text>
                  </View>
                  {item.commentaire ? (
                    <Text style={styles.rdvComment} numberOfLines={2}>{item.commentaire}</Text>
                  ) : null}
                </View>
                <View style={styles.rdvChevron}>
                  <Feather name="chevron-right" size={16} color="#CBD5E1" />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, styles.sectionCardTopSpacing]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Répartition des statuts</Text>
            <Text style={styles.sectionSubtitle}>
              Contrats, RDV, refus, absents
            </Text>
          </View>
        </View>
        <View style={styles.chartCard}>
          <View
            style={[
              styles.chartSurface,
              { width: pieRenderSize, height: pieRenderSize },
            ]}
          >
            <PolarChart
              data={pieData}
              labelKey="label"
              valueKey="value"
              colorKey="color"
              containerStyle={{ width: pieRenderSize, height: pieRenderSize }}
              canvasStyle={{ width: pieRenderSize, height: pieRenderSize }}
            >
              <Pie.Chart innerRadius={72} size={pieRenderSize} />
            </PolarChart>
          </View>
          {hasPieData && (
            <View style={styles.pieLegend}>
              {piePercentages.map((item) => (
                <View key={item.label} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.legendLabel}>
                    {item.label} · {item.percent}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 140,
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  kpiHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  sectionCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 16,
  },
  sectionCardTopSpacing: {
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionMetric: {
    flex: 1,
    gap: 4,
  },
  sectionValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  sectionDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  chartCard: {
    alignItems: "center",
  },
  chartSurface: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  yAxisLabel: {
    fontSize: 11,
    color: "#94A3B8",
  },
  axisLabel: {
    fontSize: 10,
    color: "#94A3B8",
  },
  giftedChartWrap: {
    paddingTop: 8,
  },

  pieLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
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
  overviewCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 20,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  overviewSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  segmentTextActive: {
    color: "#2563EB",
  },
  overviewDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  chartSection: {
    gap: 12,
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chartHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  loadingText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  kpiSkeletonTop: {
    width: "52%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E2E8F0",
  },
  kpiSkeletonValue: {
    marginTop: 16,
    width: "64%",
    height: 28,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  kpiSkeletonHint: {
    marginTop: 10,
    width: "58%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  sectionSkeletonTitle: {
    width: "40%",
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  sectionSkeletonSubtitle: {
    width: "58%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  sectionSkeletonChart: {
    marginTop: 8,
    height: 170,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  chartLegendRow: {
    flexDirection: "row",
    gap: 12,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chartLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartLegendText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    gap: 2,
  },
  dayPillActive: {
    backgroundColor: "#2563EB",
  },
  dayPillToday: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  dayPillLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  dayPillLabelActive: {
    color: "#FFFFFF",
  },
  dayPillDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  dayPillDateActive: {
    color: "#FFFFFF",
  },
  dayPillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  dayPillDotActive: {
    backgroundColor: "#FFFFFF",
  },
  dayPillDotSpacer: {
    width: 5,
    height: 5,
  },
  rdvEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 8,
  },
  rdvEmptyText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  rdvList: {
    gap: 8,
  },
  rdvCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  rdvTimeCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  rdvTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rdvTimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  rdvInfoCol: {
    flex: 1,
    gap: 2,
  },
  rdvPorteLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  rdvEtageLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  rdvAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rdvAddressText: {
    fontSize: 11,
    color: "#94A3B8",
    flex: 1,
  },
  rdvComment: {
    fontSize: 11,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 4,
  },
  rdvChevron: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
  },
});
