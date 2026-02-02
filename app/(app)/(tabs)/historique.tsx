import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import type { Immeuble, StatusHistorique } from "@/types/api";
import { api } from "@/services/api";

const FILTERS = [
  { key: "all", label: "Tous", icon: "layers" },
  { key: "24h", label: "24h", icon: "clock" },
  { key: "7d", label: "7j", icon: "calendar" },
  { key: "30d", label: "30j", icon: "calendar" },
];

const STATUS_STYLE: Record<
  string,
  { label: string; bg: string; fg: string; dot: string }
> = {
  NON_VISITE: { label: "Non visite", bg: "#E2E8F0", fg: "#475569", dot: "#94A3B8" },
  ABSENT: { label: "Absent", bg: "#FFF7ED", fg: "#9A3412", dot: "#F97316" },
  RENDEZ_VOUS_PRIS: { label: "RDV pris", bg: "#EFF6FF", fg: "#1D4ED8", dot: "#2563EB" },
  CONTRAT_SIGNE: { label: "Contrat signe", bg: "#ECFDF3", fg: "#047857", dot: "#22C55E" },
  REFUS: { label: "Refus", bg: "#FEF2F2", fg: "#B91C1C", dot: "#EF4444" },
  ARGUMENTE: { label: "Argumente", bg: "#EEF2FF", fg: "#4338CA", dot: "#6366F1" },
  NECESSITE_REPASSAGE: {
    label: "Repassage",
    bg: "#FFFBEB",
    fg: "#92400E",
    dot: "#F59E0B",
  },
};

export default function HistoriqueScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [historyMap, setHistoryMap] = useState<Record<number, StatusHistorique[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const immeubles = useMemo(() => (profile?.immeubles || []) as Immeuble[], [profile]);

  const sortedImmeubles = useMemo(() => {
    return [...immeubles].sort((a, b) => {
      const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [immeubles]);

  const filteredImmeubles = useMemo(() => {
    const now = Date.now();
    return sortedImmeubles.filter(imm => {
      const lastModified = imm.updatedAt ? new Date(imm.updatedAt).getTime() : 0;
      if (filter === "24h") return now - lastModified < 24 * 60 * 60 * 1000;
      if (filter === "7d") return now - lastModified < 7 * 24 * 60 * 60 * 1000;
      if (filter === "30d") return now - lastModified < 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [sortedImmeubles, filter]);

  const visibleImmeubles = filteredImmeubles;

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (visibleImmeubles.length === 0) {
        setHistoryMap({});
        return;
      }
      setHistoryLoading(true);
      const entries: Record<number, StatusHistorique[]> = {};
      await Promise.all(
        visibleImmeubles.map(async (imm) => {
          try {
            const history = await api.portes.statusHistoriqueByImmeuble(imm.id);
            entries[imm.id] = history || [];
          } catch {
            entries[imm.id] = [];
          }
        }),
      );
      if (!cancelled) {
        setHistoryMap(entries);
        setHistoryLoading(false);
      }
    };
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [visibleImmeubles]);

  const buildImmeublePipeline = (history: StatusHistorique[]) => {
    if (history.length === 0) return null;
    const sorted = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const steps: string[] = [];
    sorted.forEach((event) => {
      if (steps[steps.length - 1] !== event.statut) {
        steps.push(event.statut);
      }
    });
    return {
      steps,
      date: sorted[sorted.length - 1].createdAt,
    };
  };

  const buildPortePipelines = (history: StatusHistorique[]) => {
    if (history.length === 0) return [];
    const grouped = new Map<number, StatusHistorique[]>();
    history.forEach((event) => {
      const list = grouped.get(event.porteId) ?? [];
      list.push(event);
      grouped.set(event.porteId, list);
    });
    const pipelines = Array.from(grouped.entries()).map(([porteId, events]) => {
      const sorted = [...events].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const steps: string[] = [];
      sorted.forEach((event) => {
        if (steps[steps.length - 1] !== event.statut) {
          steps.push(event.statut);
        }
      });
      const last = sorted[sorted.length - 1];
      const porte = last.porte;
      return {
        porteId,
        porteLabel: porte
          ? `Porte ${porte.numero} • Etage ${porte.etage}`
          : `Porte ${porteId}`,
        lastDate: last.createdAt,
        steps,
      };
    });
    return pipelines.sort(
      (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime(),
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonFiltersRow}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={index} style={styles.skeletonFilter} />
            ))}
          </View>
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleImmeubles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.filtersRow}>
              {FILTERS.map((item) => {
                const selected = item.key === filter;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={[styles.filterChip, selected && styles.filterChipActive]}
                  >
                    <Feather
                      name={item.icon as keyof typeof Feather.glyphMap}
                      size={12}
                      color={selected ? "#FFFFFF" : "#64748B"}
                    />
                    <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {loading && <Text style={styles.helper}>Chargement...</Text>}
            {historyLoading && !loading && (
              <Text style={styles.helper}>Chargement historique...</Text>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyCard}>
              <Feather name="home" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>Aucun immeuble pour cette periode</Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        renderItem={({ item: immeuble }) => (
          <View style={styles.card}>
            <View style={styles.cardIcon}>
              <Feather name="home" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {immeuble.adresse}
              </Text>
              <View style={styles.cardMeta}>
                <Feather name="clock" size={12} color="#94A3B8" />
                <Text style={styles.cardDate}>
                  {immeuble.updatedAt
                    ? new Date(immeuble.updatedAt).toLocaleDateString("fr-FR")
                    : "Date inconnue"}
                </Text>
              </View>
              {(() => {
                const history = historyMap[immeuble.id] || [];
                const immeublePipeline = buildImmeublePipeline(history);
                const portePipelines = buildPortePipelines(history);
                if (!immeublePipeline) {
                  return (
                    <Text style={styles.cardEmptyHistory}>
                      Aucun historique de statut
                    </Text>
                  );
                }
                return (
                  <View style={styles.pipelineWrap}>
                    <Text style={styles.pipelineTitle}>Pipeline immeuble</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.pipelineRow}
                    >
                      {immeublePipeline.steps.map((statut, index) => {
                        const style = STATUS_STYLE[statut] || {
                          label: statut,
                          bg: "#E2E8F0",
                          fg: "#475569",
                          dot: "#94A3B8",
                        };
                        const isLast = index === immeublePipeline.steps.length - 1;
                        return (
                          <View key={`${statut}-${index}`} style={styles.pipelineStep}>
                            <View
                              style={[
                                styles.pipelineChip,
                                { backgroundColor: style.bg },
                              ]}
                            >
                              <View
                                style={[
                                  styles.pipelineDot,
                                  { backgroundColor: style.dot },
                                ]}
                              />
                              <Text style={[styles.pipelineText, { color: style.fg }]}>
                                {style.label}
                              </Text>
                            </View>
                            {!isLast && <View style={styles.pipelineLine} />}
                          </View>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.pipelineDoors}>
                      {portePipelines.map((porte) => (
                        <View key={porte.porteId} style={styles.pipelineDoorCard}>
                          <View style={styles.pipelineDoorHeader}>
                            <Text style={styles.pipelineDoorTitle}>{porte.porteLabel}</Text>
                            <Text style={styles.pipelineDoorDate}>
                              {new Date(porte.lastDate).toLocaleDateString("fr-FR")}
                            </Text>
                          </View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.pipelineRow}
                          >
                            {porte.steps.map((statut, index) => {
                              const style = STATUS_STYLE[statut] || {
                                label: statut,
                                bg: "#E2E8F0",
                                fg: "#475569",
                                dot: "#94A3B8",
                              };
                              const isLast = index === porte.steps.length - 1;
                              return (
                                <View
                                  key={`${porte.porteId}-${statut}-${index}`}
                                  style={styles.pipelineStep}
                                >
                                  <View
                                    style={[
                                      styles.pipelineChip,
                                      { backgroundColor: style.bg },
                                    ]}
                                  >
                                    <View
                                      style={[
                                        styles.pipelineDot,
                                        { backgroundColor: style.dot },
                                      ]}
                                    />
                                    <Text style={[styles.pipelineText, { color: style.fg }]}>
                                      {style.label}
                                    </Text>
                                  </View>
                                  {!isLast && <View style={styles.pipelineLine} />}
                                </View>
                              );
                            })}
                          </ScrollView>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </View>
            <View style={styles.cardChevron}>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </View>
          </View>
        )}
        ListFooterComponent={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  headerBlock: {
    gap: 12,
    marginBottom: 12,
  },



  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  filtersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  helper: {
    fontSize: 13,
    color: "#64748B",
  },
  error: {
    fontSize: 13,
    color: "#DC2626",
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  skeletonHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  skeletonTitle: {
    width: "35%",
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  skeletonSubtitle: {
    width: "50%",
    height: 14,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  skeletonFiltersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  skeletonFilter: {
    width: 54,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 88,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  cardMeta: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  cardEmptyHistory: {
    marginTop: 6,
    fontSize: 11,
    color: "#94A3B8",
  },
  pipelineWrap: {
    marginTop: 10,
  },
  pipelineTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  pipelineDoors: {
    marginTop: 10,
    gap: 10,
  },
  pipelineDoorCard: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pipelineDoorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pipelineDoorTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  pipelineDoorDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  pipelineRow: {
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  pipelineStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pipelineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pipelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pipelineText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pipelineLine: {
    width: 18,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  cardChevron: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  itemSeparator: {
    height: 8,
  },
});
