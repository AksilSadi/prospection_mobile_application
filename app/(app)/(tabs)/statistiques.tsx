import { useCommercialStatistics } from "@/hooks/api/use-commercial-statistics";
import { useCommercialTimeline } from "@/hooks/api/use-commercial-timeline";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import { dataSyncService } from "@/services/sync/data-sync.service";
import type { Statistic, TimelinePoint } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pie, PolarChart } from "victory-native";

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

export default function StatistiquesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const periodLabel = "7 derniers jours";
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
  const { data: statsData, loading: statsLoading, refetch: refetchStats } =
    useCommercialStatistics(commercialId);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { startDate, endDate } = useMemo(() => {
    const days = 7;
    const end = new Date(`${todayKey}T23:59:59.999Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [todayKey]);
  const {
    data: timelineData,
    loading: timelineLoading,
    refetch: refetchTimeline,
  } = useCommercialTimeline(commercialId, startDate, endDate);
  const workspaceState = useWorkspaceProfile(userId, role);

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
        void refetchStats();
        void refetchTimeline();
        return;
      }

      shouldRefetchOnFocusRef.current = true;
    });

    return unsubscribe;
  }, [commercialId, isFocused, refetchStats, refetchTimeline]);

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
    void refetchStats();
    void refetchTimeline();
  }, [commercialId, isFocused, refetchStats, refetchTimeline]);

  const latestStats = useMemo<Statistic | null>(() => {
    const stats = statsData || [];
    if (!stats.length) return null;
    return [...stats].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    })[0];
  }, [statsData]);

  const portesProspectees = latestStats?.nbPortesProspectes || 0;
  const immeublesWorkspace = useMemo(
    () => workspaceState.data?.immeubles?.length ?? 0,
    [workspaceState.data],
  );
  const immeublesProspectes = Math.max(
    latestStats?.nbImmeublesProspectes || 0,
    immeublesWorkspace,
  );
  const absents = latestStats?.absents || 0;
  const refus = latestStats?.refus || 0;
  const rdv = latestStats?.rendezVousPris || 0;
  const contrats = latestStats?.contratsSignes || 0;

  const isLoading = statsLoading || timelineLoading;

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

  const timelineBuckets = useMemo(() => {
    const days = 7;
    const end = new Date(`${todayKey}T00:00:00.000Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const byDay = new Map<string, TimelinePoint>();
    (timelineData || []).forEach((point) => {
      const key = point.date.slice(0, 10);
      byDay.set(key, point);
    });

    return Array.from({ length: days }).map((_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      const key = d.toISOString().slice(0, 10);
      const point = byDay.get(key);
      return {
        date: key,
        rdvPris: point?.rdvPris || 0,
        portes: point?.portesProspectees || 0,
        contrats: point?.contratsSignes || 0,
      };
    });
  }, [timelineData, todayKey]);

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
      { label: "Contrats", value: contrats, color: "#2563EB" },
      { label: "RDV", value: rdv, color: "#10B981" },
      { label: "Refus", value: refus, color: "#F59E0B" },
      { label: "Absents", value: absents, color: "#EF4444" },
    ];
    const total = base.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      return [{ label: "Aucune", value: 1, color: "#E2E8F0" }];
    }
    return base;
  }, [absents, contrats, rdv, refus]);

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

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { customStyles?: { container?: object; text?: object } }
    > = {};
    timelineBuckets.forEach((item) => {
      if (item.rdvPris > 0) {
        marks[item.date] = {
          customStyles: {
            container: {
              backgroundColor: "#DBEAFE",
              borderRadius: 8,
            },
            text: {
              color: "#1D4ED8",
              fontWeight: "700",
            },
          },
        };
      }
    });
    return marks;
  }, [timelineBuckets]);

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: "#FFFFFF",
      calendarBackground: "#FFFFFF",
      textSectionTitleColor: "#64748B",
      selectedDayBackgroundColor: "#2563EB",
      selectedDayTextColor: "#FFFFFF",
      todayTextColor: "#2563EB",
      dayTextColor: "#0F172A",
      monthTextColor: "#0F172A",
      arrowColor: "#2563EB",
      textDayFontSize: 13,
      textMonthFontSize: 16,
      textDayHeaderFontSize: 11,
    }),
    [],
  );

  const axisLabels = useMemo(() => {
    if (!timelineBuckets.length) return [];
    const days = ["D", "L", "M", "M", "J", "V", "S"];
    return timelineBuckets.map((item) => {
      const day = new Date(`${item.date}T00:00:00`).getDay();
      return days[day];
    });
  }, [timelineBuckets]);

  const maxPortes = useMemo(() => {
    return timelineBuckets.reduce((max, item) => Math.max(max, item.portes), 0);
  }, [timelineBuckets]);

  const chartDomain = useMemo(() => {
    const maxVal = Math.max(1, maxPortes);
    const exponent = Math.floor(Math.log10(maxVal));
    const base = maxVal / Math.pow(10, exponent);
    const stepBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    const step = stepBase * Math.pow(10, exponent);
    const roundedMax = Math.max(step * 2, Math.ceil(maxVal / step) * step);
    return { y: [0, roundedMax] as [number, number] };
  }, [maxPortes]);

  const yAxisStep = useMemo(() => {
    return Math.max(1, Math.round(chartDomain.y[1] / 2)); 
  }, [chartDomain]);

  const yAxisLabels = useMemo(() => {     
    return [chartDomain.y[1], yAxisStep, 0].map((val) => String(val));
  }, [chartDomain, yAxisStep]);

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
    const portes: { value: number; label: string; dataPointText: string }[] = [];
    const rdvPoints: { value: number; label: string }[] = [];
    const contratsPoints: { value: number; label: string }[] = [];

    for (let index = 0; index < timelineBuckets.length; index += 1) {
      const item = timelineBuckets[index];
      const label = axisLabels[index] ?? "";
      portes.push({
        value: item.portes,
        label,
        dataPointText: String(item.portes),
      });
      rdvPoints.push({ value: item.rdvPris, label });
      contratsPoints.push({ value: item.contrats, label });
    }

    return {
      portesChartData: portes,
      rdvChartData: rdvPoints,
      contratsChartData: contratsPoints,
    };
  }, [axisLabels, timelineBuckets]);

  const renderPortesPointerLabel = useCallback(
    (items: { value?: number }[]) => {
      const item = items?.[0];
      return (
        <View style={styles.tooltipBubble}>
          <Text style={styles.tooltipValue}>{item?.value ?? 0} portes</Text>
        </View>
      );
    },
    [],
  );

  const lineChartSpacing = useMemo(
    () =>
      Math.max(
        28,
        Math.floor((chartWidth - 80) / Math.max(1, portesChartData.length - 1)),
      ),
    [chartWidth, portesChartData.length],
  );

  const barChartSpacing = useMemo(
    () =>
      Math.max(
        22,
        Math.floor((chartWidth - 80) / Math.max(1, rdvChartData.length - 1)),
      ),
    [chartWidth, rdvChartData.length],
  );

  const contratsLineSpacing = useMemo(
    () =>
      Math.max(
        28,
        Math.floor((chartWidth - 80) / Math.max(1, contratsChartData.length - 1)),
      ),
    [chartWidth, contratsChartData.length],
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
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Immeubles</Text>
            <View style={styles.kpiIcon}>
              <Feather name="home" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.kpiValue}>
            {isLoading ? "--" : immeublesProspectes}
          </Text>
          <Text style={styles.kpiHint}>Total prospectés</Text>
        </View>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Portes</Text>
            <View style={styles.kpiIcon}>
              <Feather name="grid" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.kpiValue}>
            {isLoading ? "--" : portesProspectees}
          </Text>
          <Text style={styles.kpiHint}>Total prospectées</Text>
        </View>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>RDV pris</Text>
            <View style={styles.kpiIcon}>
              <Feather name="calendar" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.kpiValue}>{isLoading ? "--" : rdv}</Text>
          <Text style={styles.kpiHint}>Rendez-vous</Text>
        </View>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Contrats</Text>
            <View style={styles.kpiIcon}>
              <Feather name="award" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.kpiValue}>{isLoading ? "--" : contrats}</Text>
          <Text style={styles.kpiHint}>Signés</Text>
        </View>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Refus</Text>
            <View style={styles.kpiIcon}>
              <Feather name="x-circle" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.kpiValue}>{isLoading ? "--" : refus}</Text>
          <Text style={styles.kpiHint}>Interactions</Text>
        </View>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>Absents</Text>
            <View style={styles.kpiIcon}>
              <Feather name="user-x" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.kpiValue}>{isLoading ? "--" : absents}</Text>
          <Text style={styles.kpiHint}>Non rencontrés</Text>
        </View>
      </View>

      <View style={[styles.sectionCard, styles.sectionCardTopSpacing]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Portes / jour</Text>
            <Text style={styles.sectionSubtitle}>{periodLabel} · {rangeLabel}</Text>
          </View>
        </View>
        <View style={styles.giftedChartWrap}>
          <LineChart
            key={`portes-chart-${chartKey}`}
            data={portesChartData}
            areaChart
            curved
            thickness={2}
            color="#2563EB"
            startFillColor="rgba(37, 99, 235, 0.22)"
            endFillColor="rgba(37, 99, 235, 0)"
            startOpacity={0.25}
            endOpacity={0}
            maxValue={chartDomain.y[1]}
            noOfSections={2}
            stepValue={yAxisStep}
            yAxisLabelWidth={32}
            yAxisTextStyle={styles.yAxisLabel}
            yAxisColor="transparent"
            yAxisThickness={0}
            xAxisColor="transparent"
            xAxisThickness={0}
            hideRules
            rulesColor="transparent"
            yAxisLabelTexts={yAxisLabels}
            xAxisLabelTextStyle={styles.axisLabel}
            showYAxisIndices={false}
            isAnimated
            animateOnDataChange
            animationDuration={350}
            spacing={lineChartSpacing}
            initialSpacing={12}
            endSpacing={12}
            hideDataPoints
            focusEnabled
            showStripOnFocus={false}
            stripColor="transparent"
            stripWidth={0}
            pointerConfig={{
              pointerStripUptoDataPoint: false,
              pointerStripColor: "transparent",
              pointerStripWidth: 0,
              pointerColor: "#2563EB",
              radius: 4,
              pointerLabelWidth: 110,
              pointerLabelHeight: 40,
              autoAdjustPointerLabelPosition: true,
              shiftPointerLabelY: -40,
               pointerLabelComponent: renderPortesPointerLabel,
             }}
           />
        </View>
      </View>

      <View style={[styles.sectionCard, styles.sectionCardTopSpacing]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Rendez-vous / jour</Text>
            <Text style={styles.sectionSubtitle}>{periodLabel} · {rangeLabel}</Text>
          </View>
        </View>
        <View style={styles.giftedChartWrap}>
          <BarChart
            data={rdvChartData}
            barWidth={16}
            spacing={barChartSpacing}
            initialSpacing={10}
            endSpacing={10}
            height={180}
            maxValue={chartDomain.y[1]}
            noOfSections={2}
            stepValue={yAxisStep}
            yAxisLabelWidth={32}
            yAxisTextStyle={styles.yAxisLabel}
            yAxisColor="transparent"
            yAxisThickness={0}
            xAxisColor="transparent"
            xAxisThickness={0}
            xAxisLabelTextStyle={styles.axisLabel}
            showYAxisIndices={false}
            isAnimated
            animationDuration={350}
            frontColor="#10B981"
            hideRules
            rulesColor="transparent"
            yAxisLabelTexts={yAxisLabels}
          />
        </View>
      </View>

      <View style={[styles.sectionCard, styles.sectionCardTopSpacing]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Contrats signés / jour</Text>
            <Text style={styles.sectionSubtitle}>{periodLabel} · {rangeLabel}</Text>
          </View>
        </View>
        <View style={styles.giftedChartWrap}>
          <LineChart
            data={contratsChartData}
            areaChart
            curved
            thickness={2}
            color="#F59E0B"
            startFillColor="rgba(245, 158, 11, 0.18)"
            endFillColor="rgba(245, 158, 11, 0)"
            startOpacity={0.25}
            endOpacity={0}
            maxValue={chartDomain.y[1]}
            noOfSections={2}
            stepValue={yAxisStep}
            yAxisLabelWidth={32}
            yAxisTextStyle={styles.yAxisLabel}
            yAxisColor="transparent"
            yAxisThickness={0}
            xAxisColor="transparent"
            xAxisThickness={0}
            hideRules
            rulesColor="transparent"
            yAxisLabelTexts={yAxisLabels}
            xAxisLabelTextStyle={styles.axisLabel}
            showYAxisIndices={false}
            spacing={contratsLineSpacing}
            initialSpacing={12}
            endSpacing={12}
            hideDataPoints
            isAnimated
            animateOnDataChange
            animationDuration={350}
          />
        </View>
      </View>

      <View style={[styles.sectionCard, styles.sectionCardTopSpacing]}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Calendrier RDV</Text>
            <Text style={styles.sectionSubtitle}>Jours avec rendez-vous</Text>
          </View>
        </View>
        <Calendar
          markedDates={markedDates}
          markingType="custom"
          theme={calendarTheme}
        />
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
    flexBasis: "48%",
    borderRadius: 18,
    padding: 16,
    minHeight: 120,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
    fontSize: 11,
    color: "#94A3B8",
  },
  giftedChartWrap: {
    paddingTop: 8,
  },
  tooltipBubble: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
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
  periodRow: {
    flexDirection: "row",
    gap: 8,
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
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  periodChipTextActive: {
    color: "#FFFFFF",
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
});
