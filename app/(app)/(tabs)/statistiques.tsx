import { useCommercialActivity } from "@/hooks/api/use-commercial-activity";
import { useCommercialStatistics } from "@/hooks/api/use-commercial-statistics";
import { authService } from "@/services/auth";
import type { Statistic } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StatistiquesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
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

  const commercialId = role === "commercial" ? userId : null;
  const statsState = useCommercialStatistics(commercialId);
  const activityState = useCommercialActivity();

  const latestStats = useMemo<Statistic | null>(() => {
    const stats = statsState.data || [];
    if (!stats.length) return null;
    return [...stats].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    })[0];
  }, [statsState.data]);

  const totalActions = useMemo(() => {
    if (!latestStats) return 0;
    return (
      latestStats.refus +
      latestStats.rendezVousPris +
      latestStats.contratsSignes
    );
  }, [latestStats]);

  const tauxConversion = useMemo(() => {
    if (!latestStats || totalActions === 0) return 0;
    return Math.round((latestStats.contratsSignes / totalActions) * 100);
  }, [latestStats, totalActions]);

  const tauxRdv = useMemo(() => {
    if (!latestStats || totalActions === 0) return 0;
    return Math.round((latestStats.rendezVousPris / totalActions) * 100);
  }, [latestStats, totalActions]);

  const portesProspectees = latestStats?.nbPortesProspectes || 0;
  const immeublesProspectes = latestStats?.nbImmeublesProspectes || 0;
  const absents = latestStats?.absents || 0;
  const argumentes = latestStats?.argumentes || 0;
  const refus = latestStats?.refus || 0;
  const rdv = latestStats?.rendezVousPris || 0;
  const contrats = latestStats?.contratsSignes || 0;

  const modifiedToday = activityState.modified.data?.length || 0;
  const rdvToday = activityState.rdvToday.data?.length || 0;

  const isLoading =
    statsState.loading ||
    activityState.modified.loading ||
    activityState.rdvToday.loading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCardPrimary, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiIconPrimary}>
            <Feather name="award" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.kpiValuePrimary}>
            {isLoading ? "—" : contrats}
          </Text>
          <Text style={styles.kpiLabelPrimary}>Contrats signés</Text>
        </View>
        <View
          style={[styles.kpiCardSecondary, isTablet && styles.kpiCardTablet]}
        >
          <View style={styles.kpiIconSecondary}>
            <Feather name="calendar" size={18} color="#2563EB" />
          </View>
          <Text style={styles.kpiValueSecondary}>{isLoading ? "—" : rdv}</Text>
          <Text style={styles.kpiLabelSecondary}>RDV pris</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={[styles.kpiCardLight, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiIconLight}>
            <Feather name="x-circle" size={18} color="#DC2626" />
          </View>
          <Text style={styles.kpiValueLight}>{isLoading ? "—" : refus}</Text>
          <Text style={styles.kpiLabelLight}>Refus</Text>
        </View>
        <View style={[styles.kpiCardLight, isTablet && styles.kpiCardTablet]}>
          <View style={styles.kpiIconLight}>
            <Feather name="moon" size={18} color="#0EA5E9" />
          </View>
          <Text style={styles.kpiValueLight}>{isLoading ? "—" : absents}</Text>
          <Text style={styles.kpiLabelLight}>Absents</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Feather name="activity" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Activité du jour</Text>
            <Text style={styles.sectionSubtitle}>Mise à jour en direct</Text>
          </View>
        </View>
        <View style={styles.sectionRow}>
          <View style={styles.sectionMetric}>
            <Text style={styles.sectionValue}>
              {isLoading ? "—" : modifiedToday}
            </Text>
            <Text style={styles.sectionLabel}>Portes modifiées</Text>
          </View>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionMetric}>
            <Text style={styles.sectionValue}>
              {isLoading ? "—" : rdvToday}
            </Text>
            <Text style={styles.sectionLabel}>RDV aujourd'hui</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Feather name="pie-chart" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Funnel de conversion</Text>
            <Text style={styles.sectionSubtitle}>Vue globale</Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${tauxConversion}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{tauxConversion}%</Text>
        </View>
        <View style={styles.funnelRow}>
          <View style={styles.funnelMetric}>
            <Text style={styles.funnelValue}>{rdv}</Text>
            <Text style={styles.funnelLabel}>RDV</Text>
          </View>
          <View style={styles.funnelMetric}>
            <Text style={styles.funnelValue}>{contrats}</Text>
            <Text style={styles.funnelLabel}>Contrats</Text>
          </View>
          <View style={styles.funnelMetric}>
            <Text style={styles.funnelValue}>{tauxRdv}%</Text>
            <Text style={styles.funnelLabel}>Taux RDV</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Feather name="map" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Prospection</Text>
            <Text style={styles.sectionSubtitle}>Volumes cumulés</Text>
          </View>
        </View>
        <View style={styles.sectionRow}>
          <View style={styles.sectionMetric}>
            <Text style={styles.sectionValue}>
              {isLoading ? "—" : immeublesProspectes}
            </Text>
            <Text style={styles.sectionLabel}>Immeubles prospectés</Text>
          </View>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionMetric}>
            <Text style={styles.sectionValue}>
              {isLoading ? "—" : portesProspectees}
            </Text>
            <Text style={styles.sectionLabel}>Portes prospectées</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Feather name="message-square" size={18} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Qualité des échanges</Text>
            <Text style={styles.sectionSubtitle}>Argumentés & contacts</Text>
          </View>
        </View>
        <View style={styles.sectionRow}>
          <View style={styles.sectionMetric}>
            <Text style={styles.sectionValue}>
              {isLoading ? "—" : argumentes}
            </Text>
            <Text style={styles.sectionLabel}>Argumentés</Text>
          </View>
          <View style={styles.sectionDivider} />
          <View style={styles.sectionMetric}>
            <Text style={styles.sectionValue}>
              {isLoading ? "—" : totalActions}
            </Text>
            <Text style={styles.sectionLabel}>Actions totales</Text>
          </View>
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
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  funnelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  funnelMetric: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  funnelValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  funnelLabel: {
    fontSize: 11,
    color: "#64748B",
  },
});
