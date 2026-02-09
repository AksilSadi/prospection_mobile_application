import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import type { Immeuble, StatusHistorique } from "@/types/api";
import { api } from "@/services/api";
import { dataSyncService } from "@/services/sync/data-sync.service";

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

const STATUS_FALLBACK = {
  label: "Inconnu",
  bg: "#E2E8F0",
  fg: "#475569",
  dot: "#94A3B8",
};

const FILTER_TO_MS: Record<string, number> = {
  all: Number.POSITIVE_INFINITY,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

type PortePipeline = {
  porteId: number;
  porteLabel: string;
  lastDate: string;
  events: StatusHistorique[];
};

type HistoryMeta = {
  porteCount: number;
  historyCount: number;
  pipelines: PortePipeline[];
};

const EMPTY_HISTORY_META: HistoryMeta = {
  porteCount: 0,
  historyCount: 0,
  pipelines: [],
};

function buildHistoryMeta(history: StatusHistorique[]): HistoryMeta {
  if (history.length === 0) return EMPTY_HISTORY_META;

  const grouped = new Map<number, StatusHistorique[]>();
  for (const event of history) {
    const list = grouped.get(event.porteId) ?? [];
    list.push(event);
    grouped.set(event.porteId, list);
  }

  const pipelines = Array.from(grouped.entries()).map(([porteId, events]) => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const last = sorted[sorted.length - 1];
    const porte = last.porte;

    return {
      porteId,
      porteLabel: porte
        ? `Porte ${porte.numero} • Etage ${porte.etage}`
        : `Porte ${porteId}`,
      lastDate: last.createdAt,
      events: sorted,
    };
  });

  const orderedPipelines = pipelines.sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  return {
    porteCount: grouped.size,
    historyCount: history.length,
    pipelines: orderedPipelines,
  };
}

type HistoriqueImmeubleCardProps = {
  immeuble: Immeuble;
  isExpanded: boolean;
  expandAnim: Animated.Value;
  cardAnim: Animated.Value;
  historyMeta: HistoryMeta;
  onToggle: (immeubleId: number) => void;
};

const HistoriqueImmeubleCard = memo(
  function HistoriqueImmeubleCard({
    immeuble,
    isExpanded,
    expandAnim,
    cardAnim,
    historyMeta,
    onToggle,
  }: HistoriqueImmeubleCardProps) {
    const portePipelines = historyMeta.pipelines;

    return (
      <View>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          android_ripple={{ color: "#E2E8F0" }}
          onPress={() => onToggle(immeuble.id)}
        >
          <Animated.View
            style={[
              styles.cardInner,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
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
              <View style={styles.cardStats}>
                <View style={styles.statChip}>
                  <Feather name="grid" size={12} color="#2563EB" />
                  <Text style={styles.statText}>{historyMeta.porteCount} portes</Text>
                </View>
                <View style={styles.statChip}>
                  <Feather name="activity" size={12} color="#0EA5E9" />
                  <Text style={styles.statText}>{historyMeta.historyCount} actions</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardChevron}>
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: expandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "180deg"],
                      }),
                    },
                  ],
                }}
              >
                <Feather name="chevron-down" size={18} color="#94A3B8" />
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>

        {isExpanded ? (
          <Animated.View
            style={[
              {
                opacity: expandAnim,
                transform: [
                  {
                    translateY: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                    }),
                  },
                  {
                    scale: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {portePipelines.length === 0 ? (
              <View style={styles.historyEmptyPanel}>
                <Feather name="inbox" size={20} color="#94A3B8" />
                <Text style={styles.historyEmptyTitle}>
                  Aucun historique pour cet immeuble
                </Text>
              </View>
            ) : (
              <View style={styles.historyPanel}>
                <Text style={styles.historyPanelTitle}>Historique des portes</Text>
                {portePipelines.map((porte) => (
                  <View key={porte.porteId} style={styles.historyDoorCard}>
                    <View style={styles.historyDoorHeader}>
                      <Text style={styles.historyDoorTitle}>{porte.porteLabel}</Text>
                      <Text style={styles.historyDoorDate}>
                        {new Date(porte.lastDate).toLocaleString("fr-FR")}
                      </Text>
                    </View>
                    <View style={styles.historyTimeline}>
                      {porte.events.map((event, index) => {
                        const style = STATUS_STYLE[event.statut] || {
                          ...STATUS_FALLBACK,
                          label: event.statut,
                        };
                        const isLast = index === porte.events.length - 1;
                        return (
                          <View key={event.id} style={styles.timelineRow}>
                            <View style={styles.timelineLeft}>
                              <View
                                style={[
                                  styles.timelineDot,
                                  { backgroundColor: style.dot },
                                ]}
                              />
                              {!isLast && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineContent}>
                              <View
                                style={[
                                  styles.timelineChip,
                                  { backgroundColor: style.bg },
                                ]}
                              >
                                <Text style={[styles.timelineText, { color: style.fg }]}> 
                                  {style.label}
                                </Text>
                              </View>
                              <Text style={styles.timelineDate}>
                                {new Date(event.createdAt).toLocaleString("fr-FR")}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}
      </View>
    );
  },
  (prev, next) =>
    prev.immeuble.id === next.immeuble.id &&
    prev.immeuble.adresse === next.immeuble.adresse &&
    prev.immeuble.updatedAt === next.immeuble.updatedAt &&
    prev.isExpanded === next.isExpanded &&
    prev.expandAnim === next.expandAnim &&
    prev.cardAnim === next.cardAnim &&
    prev.historyMeta === next.historyMeta &&
    prev.onToggle === next.onToggle,
);

export default function HistoriqueScreen() {
  const isFocused = useIsFocused();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [historyMap, setHistoryMap] = useState<Record<number, StatusHistorique[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedImmeubleId, setExpandedImmeubleId] = useState<number | null>(null);
  const loadedHistoryIdsRef = useRef<Set<number>>(new Set());
  const pendingRefreshIdsRef = useRef<Set<number>>(new Set());
  const expandAnimsRef = useState(() => new Map<number, Animated.Value>())[0];
  const cardAnimsRef = useState(() => new Map<number, Animated.Value>())[0];
  const skeletonPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  const getExpandAnim = useCallback((id: number) => {
    const existing = expandAnimsRef.get(id);
    if (existing) return existing;
    const next = new Animated.Value(0);
    expandAnimsRef.set(id, next);
    return next;
  }, [expandAnimsRef]);

  const getCardAnim = useCallback((id: number) => {
    const existing = cardAnimsRef.get(id);
    if (existing) return existing;
    const next = new Animated.Value(0);
    cardAnimsRef.set(id, next);
    return next;
  }, [cardAnimsRef]);

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
    const rangeMs = FILTER_TO_MS[filter] ?? Number.POSITIVE_INFINITY;
    return sortedImmeubles.filter((imm) => {
      const lastModified = imm.updatedAt ? new Date(imm.updatedAt).getTime() : 0;
      return now - lastModified < rangeMs;
    });
  }, [sortedImmeubles, filter]);

  const visibleImmeubles = filteredImmeubles;

  const refreshHistoryForImmeuble = useCallback(async (immeubleId: number) => {
    try {
      const history = await api.portes.statusHistoriqueByImmeuble(immeubleId);
      loadedHistoryIdsRef.current.add(immeubleId);
      setHistoryMap((prev) => ({ ...prev, [immeubleId]: history || [] }));
    } catch {
      loadedHistoryIdsRef.current.delete(immeubleId);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      skeletonPulse.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [loading, skeletonPulse]);

  useEffect(() => {
    if (visibleImmeubles.length === 0) return;
    const animations = visibleImmeubles.map((imm, index) => {
      const anim = getCardAnim(imm.id);
      anim.setValue(0);
      return Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        delay: index * 45,
        useNativeDriver: true,
      });
    });
    Animated.stagger(60, animations).start();
  }, [getCardAnim, visibleImmeubles]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (visibleImmeubles.length === 0) {
        setHistoryLoading(false);
        return;
      }

      const missingImmeubles = visibleImmeubles.filter(
        (imm) => !loadedHistoryIdsRef.current.has(imm.id),
      );

      if (missingImmeubles.length === 0) {
        setHistoryLoading(false);
        return;
      }

      setHistoryLoading(true);
      const entries: Record<number, StatusHistorique[]> = {};

      await Promise.all(
        missingImmeubles.map(async (imm) => {
          try {
            const history = await api.portes.statusHistoriqueByImmeuble(imm.id);
            entries[imm.id] = history || [];
            loadedHistoryIdsRef.current.add(imm.id);
          } catch {
            entries[imm.id] = [];
          }
        }),
      );

      if (!cancelled) {
        setHistoryMap((prev) => ({ ...prev, ...entries }));
        setHistoryLoading(false);
      }
    };

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [visibleImmeubles]);

  useEffect(() => {
    const unsubscribe = dataSyncService.subscribe((event) => {
      if (
        event.type !== "PORTE_CREATED" &&
        event.type !== "PORTE_UPDATED" &&
        event.type !== "PORTE_DELETED"
      ) {
        return;
      }

      if (!event.immeubleId) {
        return;
      }

      loadedHistoryIdsRef.current.delete(event.immeubleId);
      if (!isFocused) {
        pendingRefreshIdsRef.current.add(event.immeubleId);
        return;
      }

      void refreshHistoryForImmeuble(event.immeubleId);
    });

    return unsubscribe;
  }, [isFocused, refreshHistoryForImmeuble]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    const pendingIds = Array.from(pendingRefreshIdsRef.current);
    if (pendingIds.length === 0) {
      return;
    }

    pendingRefreshIdsRef.current.clear();
    void Promise.all(pendingIds.map((immeubleId) => refreshHistoryForImmeuble(immeubleId)));
  }, [isFocused, refreshHistoryForImmeuble]);

  const historyMetaByImmeuble = useMemo(() => {
    const entries: Record<number, HistoryMeta> = {};

    for (const imm of visibleImmeubles) {
      const history = historyMap[imm.id] ?? [];
      entries[imm.id] = buildHistoryMeta(history);
    }

    return entries;
  }, [historyMap, visibleImmeubles]);

  const toggleExpand = useCallback((immeubleId: number) => {
    const currentId = expandedImmeubleId;
    if (currentId === immeubleId) {
      const anim = getExpandAnim(immeubleId);
      Animated.timing(anim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        setExpandedImmeubleId(null);
      });
      return;
    }

    if (currentId !== null && currentId !== immeubleId) {
      getExpandAnim(currentId).setValue(0);
    }

    setExpandedImmeubleId(immeubleId);
    const anim = getExpandAnim(immeubleId);
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [expandedImmeubleId, getExpandAnim]);

  const handleFilterPress = useCallback((nextFilter: string) => {
    setFilter(nextFilter);
  }, []);

  const renderSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

  const renderImmeubleItem = useCallback(
    ({ item: immeuble }: { item: Immeuble }) => {
      const isExpanded = expandedImmeubleId === immeuble.id;
      const expandAnim = getExpandAnim(immeuble.id);
      const cardAnim = getCardAnim(immeuble.id);
      const historyMeta = historyMetaByImmeuble[immeuble.id] ?? EMPTY_HISTORY_META;

      return (
        <HistoriqueImmeubleCard
          immeuble={immeuble}
          isExpanded={isExpanded}
          expandAnim={expandAnim}
          cardAnim={cardAnim}
          historyMeta={historyMeta}
          onToggle={toggleExpand}
        />
      );
    },
    [
      expandedImmeubleId,
      getCardAnim,
      getExpandAnim,
      historyMetaByImmeuble,
      toggleExpand,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.filtersRow}>
          {FILTERS.map((item) => {
            const selected = item.key === filter;
            return (
              <Pressable
                key={item.key}
                onPress={() => handleFilterPress(item.key)}
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
    ),
    [error, filter, handleFilterPress, historyLoading, loading],
  );

  const listEmpty = useMemo(
    () =>
      !loading && !error ? (
        <View style={styles.emptyCard}>
          <Feather name="home" size={32} color="#94A3B8" />
          <Text style={styles.emptyText}>Aucun immeuble pour cette periode</Text>
        </View>
      ) : null,
    [error, loading],
  );

  if (loading) {
    const skeletonOpacity = skeletonPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    });
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <Animated.View style={[styles.skeletonTitle, { opacity: skeletonOpacity }]} />
          <Animated.View
            style={[styles.skeletonSubtitle, { opacity: skeletonOpacity }]}
          />
          <View style={styles.skeletonFiltersRow}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Animated.View
                key={index}
                style={[styles.skeletonFilter, { opacity: skeletonOpacity }]}
              />
            ))}
          </View>
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Animated.View
              key={index}
              style={[styles.skeletonCard, { opacity: skeletonOpacity }]}
            />
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
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={24}
        removeClippedSubviews
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={renderSeparator}
        renderItem={renderImmeubleItem}
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
    height: 96,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
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
  cardStats: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  statText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  cardChevron: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  historyPanel: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  historyPanelTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  historyEmptyPanel: {
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 8,
  },
  historyEmptyTitle: {
    fontSize: 12,
    color: "#94A3B8",
  },
  historyDoorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  historyDoorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  historyDoorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  historyDoorDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  historyTimeline: {
    gap: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 16,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: "#E2E8F0",
  },
  timelineContent: {
    flex: 1,
    gap: 6,
  },
  timelineChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timelineText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timelineDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  itemSeparator: {
    height: 10,
  },
});




