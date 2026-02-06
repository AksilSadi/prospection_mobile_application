import { useCommercialStatistics } from "@/hooks/api/use-commercial-statistics";
import { useCommercialTimeline } from "@/hooks/api/use-commercial-timeline";
import { authService } from "@/services/auth";
import type { Statistic, TimelinePoint } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
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

export default function StatistiquesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [chartKey, setChartKey] = useState(0);

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

  useEffect(() => {
    if (isFocused) {
      setChartKey((prev) => prev + 1);
    }
  }, [isFocused]);

  const commercialId = role === "commercial" ? userId : null;
  const statsState = useCommercialStatistics(commercialId);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { startDate, endDate } = useMemo(() => {
    const days = period === "30d" ? 30 : 7;
    const end = new Date(`${todayKey}T23:59:59.999Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [period, todayKey]);

  const timelineState = useCommercialTimeline(commercialId, startDate, endDate);

  const latestStats = useMemo<Statistic | null>(() => {
    const stats = statsState.data || [];
    if (!stats.length) return null;
    return [...stats].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    })[0];
  }, [statsState.data]);

  const portesProspectees = latestStats?.nbPortesProspectes || 0;
  const immeublesProspectes = latestStats?.nbImmeublesProspectes || 0;
  const absents = latestStats?.absents || 0;
  const refus = latestStats?.refus || 0;
  const rdv = latestStats?.rendezVousPris || 0;
  const contrats = latestStats?.contratsSignes || 0;

  const isLoading = statsState.loading || timelineState.loading;

  const timelineBuckets = useMemo(() => {
    const days = period === "30d" ? 30 : 7;
    const end = new Date(`${todayKey}T00:00:00.000Z`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const byDay = new Map<string, TimelinePoint>();
    (timelineState.data || []).forEach((point) => {
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
  }, [period, timelineState.data, todayKey]);

  const chartWidth = Math.min(width - 40, 520);
  const pieSize = 240;
  const pieRenderSize = Math.min(chartWidth, pieSize);
  const monthNames = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

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

  const formatDayLabel = (dateKey: string, withMonth = false) => {
    const date = new Date(`${dateKey}T00:00:00`);
    const day = String(date.getDate()).padStart(2, "0");
    if (!withMonth) return day;
    const month = monthNames[date.getMonth()] ?? "";
    return `${day} ${month}`;
  };

  const axisLabels = useMemo(() => {
    if (!timelineBuckets.length) return [];
    if (period === "7d") {
      const days = ["D", "L", "M", "M", "J", "V", "S"];
      return timelineBuckets.map((item) => {
        const day = new Date(`${item.date}T00:00:00`).getDay();
        return days[day];
      });
    }
    return timelineBuckets
      .map((item, index) => ({
        label: formatDayLabel(item.date, true),
        index,
      }))
      .filter(
        (item) =>
          item.index === 0 ||
          item.index === timelineBuckets.length - 1 ||
          item.index % 5 === 0,
      )
      .map((item) => item.label);
  }, [period, timelineBuckets]);

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

  const maxContrats = useMemo(() => {
    return timelineBuckets.reduce(
      (max, item) => Math.max(max, item.contrats),
      0,
    );
  }, [timelineBuckets]);

  const contratsDomain = useMemo(() => {
    const maxVal = Math.max(1, maxContrats);
    const exponent = Math.floor(Math.log10(maxVal));
    const base = maxVal / Math.pow(10, exponent);
    const stepBase = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
    const step = stepBase * Math.pow(10, exponent);
    const roundedMax = Math.max(step * 2, Math.ceil(maxVal / step) * step);
    return { y: [0, roundedMax] as [number, number] };
  }, [maxContrats]);

  const contratsStep = useMemo(() => {
    return Math.max(1, Math.round(contratsDomain.y[1] / 2));
  }, [contratsDomain]);

  const contratsYAxisLabels = useMemo(() => {
    return [contratsDomain.y[1], contratsStep, 0].map((val) => String(val));
  }, [contratsDomain, contratsStep]);

  const rangeLabel = useMemo(() => {
    if (!timelineBuckets.length) return "—";
    const start = formatDayLabel(timelineBuckets[0].date, true);
    const end = formatDayLabel(
      timelineBuckets[timelineBuckets.length - 1].date,
      true,
    );
    return `${start} - ${end}`;
  }, [timelineBuckets]);

  const portesChartData = useMemo(() => {
    return timelineBuckets.map((item, index) => ({
      value: item.portes,
      label: axisLabels[index] ?? "",
      dataPointText: String(item.portes),
    }));
  }, [axisLabels, timelineBuckets]);

  const rdvChartData = useMemo(() => {
    return timelineBuckets.map((item, index) => ({
      value: item.rdvPris,
      label: axisLabels[index] ?? "",
    }));
  }, [axisLabels, timelineBuckets]);

  const contratsChartData = useMemo(() => {
    return timelineBuckets.map((item, index) => ({
      value: item.contrats,
      label: axisLabels[index] ?? "",
    }));
  }, [axisLabels, timelineBuckets]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
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

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Portes / jour</Text>
            <Text style={styles.sectionSubtitle}>{rangeLabel}</Text>
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
            spacing={Math.max(
              28,
              Math.floor(
                (chartWidth - 80) / Math.max(1, portesChartData.length - 1),
              ),
            )}
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
              pointerLabelComponent: (items) => {
                const item = items?.[0];
                return (
                  <View style={styles.tooltipBubble}>
                    <Text style={styles.tooltipValue}>
                      {item?.value ?? 0} portes
                    </Text>
                  </View>
                );
              },
            }}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Rendez-vous / jour</Text>
            <Text style={styles.sectionSubtitle}>{rangeLabel}</Text>
          </View>
        </View>
        <View style={styles.giftedChartWrap}>
          <BarChart
            data={rdvChartData}
            barWidth={16}
            spacing={Math.max(
              22,
              Math.floor(
                (chartWidth - 80) / Math.max(1, rdvChartData.length - 1),
              ),
            )}
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

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Contrats signés / jour</Text>
            <Text style={styles.sectionSubtitle}>{rangeLabel}</Text>
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
            spacing={Math.max(
              28,
              Math.floor(
                (chartWidth - 80) / Math.max(1, contratsChartData.length - 1),
              ),
            )}
            initialSpacing={12}
            endSpacing={12}
            hideDataPoints
            isAnimated
            animateOnDataChange
            animationDuration={350}
          />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Calendrier RDV</Text>
            <Text style={styles.sectionSubtitle}>Jours avec rendez-vous</Text>
          </View>
        </View>
        <Calendar
          markedDates={markedDates}
          markingType="custom"
          theme={{
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
          }}
        />
      </View>

      <View style={styles.sectionCard}>
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
});
