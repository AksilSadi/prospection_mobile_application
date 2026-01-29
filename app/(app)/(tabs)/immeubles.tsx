import AddImmeubleSheet from "@/components/immeubles/AddImmeubleSheet";
import ImmeubleDetailsView from "@/components/immeubles/ImmeubleDetailsScreen";
import { useCreateImmeuble } from "@/hooks/api/use-create-immeuble";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Immeuble } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ImmeublesScreenProps = {
  isActive?: boolean;
  onSwipeLockChange?: (locked: boolean) => void;
};

export default function ImmeublesScreen({
  isActive = true,
  onSwipeLockChange,
}: ImmeublesScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [progressFilter, setProgressFilter] = useState("incomplete");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedImmeubleId, setSelectedImmeubleId] = useState<number | null>(
    null,
  );
  const [detailsDirty, setDetailsDirty] = useState(false);
  const listOpacity = useRef(new Animated.Value(1)).current;
  const listTranslate = useRef(new Animated.Value(0)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;
  const detailsTranslate = useRef(new Animated.Value(24)).current;
  const [isExitingDetails, setIsExitingDetails] = useState(false);

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  useEffect(() => {
    if (!isActive && isAddOpen) {
      setIsAddOpen(false);
    }
  }, [isActive, isAddOpen]);

  useEffect(() => {
    if (selectedImmeubleId !== null) return;
    listOpacity.setValue(0);
    listTranslate.setValue(8);
    Animated.parallel([
      Animated.timing(listOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(listTranslate, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [listOpacity, listTranslate, selectedImmeubleId]);

  useEffect(() => {
    if (selectedImmeubleId === null) return;
    detailsOpacity.setValue(0);
    detailsTranslate.setValue(24);
    Animated.parallel([
      Animated.timing(detailsOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(detailsTranslate, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [detailsOpacity, detailsTranslate, selectedImmeubleId]);

  useEffect(() => {
    if (!onSwipeLockChange) return;
    onSwipeLockChange(isActive && selectedImmeubleId !== null);
  }, [isActive, onSwipeLockChange, selectedImmeubleId]);

  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useWorkspaceProfile(userId, role);
  const { create, loading: creating } = useCreateImmeuble();

  useEffect(() => {
    if (refreshTick === 0) return;
    setQuery("");
    void refetch();
  }, [refreshTick, refetch]);

  const immeubles = useMemo(
    () => (profile?.immeubles || []) as Immeuble[],
    [profile],
  );
  const filteredImmeubles = useMemo(() => {
    if (!query.trim()) return immeubles;
    const lower = query.toLowerCase();
    return immeubles.filter((imm) => imm.adresse.toLowerCase().includes(lower));
  }, [immeubles, query]);

  const immeublesEnCours = useMemo(() => {
    return filteredImmeubles.filter((imm) => {
      const portes = imm.portes || [];
      const prospectees = portes.filter((porte) => porte.statut !== "NON_VISITE").length;
      const total = portes.length;
      const percent = total === 0 ? 0 : Math.round((prospectees / total) * 100);
      if (progressFilter === "all") return true;
      if (progressFilter === "incomplete") return percent < 100;
      if (progressFilter === "low") return percent < 35;
      if (progressFilter === "mid") return percent >= 35 && percent < 70;
      if (progressFilter === "high") return percent >= 70 && percent < 100;
      if (progressFilter === "complete") return percent === 100;
      return true;
    });
  }, [filteredImmeubles, progressFilter]);

  const immeublePairs = useMemo(() => {
    const pairs: Immeuble[][] = [];
    for (let i = 0; i < immeublesEnCours.length; i += 2) {
      pairs.push(immeublesEnCours.slice(i, i + 2));
    }
    return pairs;
  }, [immeublesEnCours]);

  const totalPortes = useMemo(() => {
    return immeubles.reduce(
      (total, imm) => total + imm.nbEtages * imm.nbPortesParEtage,
      0,
    );
  }, [immeubles]);

  const selectedImmeuble = useMemo(
    () =>
      selectedImmeubleId
        ? immeubles.find((imm) => imm.id === selectedImmeubleId) || null
        : null,
    [immeubles, selectedImmeubleId],
  );

  if (selectedImmeuble) {
    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: detailsOpacity,
          transform: [{ translateX: detailsTranslate }],
        }}
      >
        <ImmeubleDetailsView
          immeuble={selectedImmeuble}
          onBack={() => {
            if (isExitingDetails) return;
            setIsExitingDetails(true);
            Animated.parallel([
              Animated.timing(detailsOpacity, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
              }),
              Animated.timing(detailsTranslate, {
                toValue: 24,
                duration: 180,
                useNativeDriver: true,
              }),
            ]).start(() => {
              setSelectedImmeubleId(null);
              setIsExitingDetails(false);
              if (detailsDirty) {
                void refetch();
                setDetailsDirty(false);
              }
            });
          }}
          onDirtyChange={setDetailsDirty}
          onRefreshImmeuble={() => void refetch()}
        />
      </Animated.View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonSummaryRow}>
            <View style={styles.skeletonSummaryCard} />
            <View style={styles.skeletonSummaryCard} />
          </View>
          <View style={styles.skeletonSearch} />
        </View>
        <View style={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={styles.skeletonCard} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          flex: 1,
          opacity: listOpacity,
          transform: [{ translateY: listTranslate }],
        }}
      >
        <FlatList
          data={immeublePairs}
          keyExtractor={(item, index) => `pair-${index}`}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Immeubles</Text>
                  <Text style={styles.subtitle}>Vue globale de vos immeubles</Text>
                </View>
                <View style={styles.headerBadge}>
                  <Feather name="home" size={16} color="#2563EB" />
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryCardPrimary}>
                  <View style={styles.summaryIconPrimary}>
                    <Feather name="layers" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.summaryValue}>{immeublesEnCours.length}</Text>
                  <Text style={styles.summaryLabel}>Immeubles a finir</Text>
                </View>
                <View style={styles.summaryCardSecondary}>
                  <View style={styles.summaryIconSecondary}>
                    <Feather name="grid" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.summaryValueSecondary}>{totalPortes}</Text>
                  <Text style={styles.summaryLabelSecondary}>Portes totales</Text>
                </View>
              </View>


              <View style={styles.filterRow}>
                <Pressable
                  style={[styles.filterChip, progressFilter === "all" && styles.filterChipActive]}
                  onPress={() => setProgressFilter("all")}
                >
                  <Feather name="layers" size={12} color={progressFilter === "all" ? "#FFFFFF" : "#2563EB"} />
                  <Text
                    style={[styles.filterChipText, progressFilter === "all" && styles.filterChipTextActive]}
                  >
                    Tous
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, progressFilter === "incomplete" && styles.filterChipActive]}
                  onPress={() => setProgressFilter("incomplete")}
                >
                  <Feather
                    name="activity"
                    size={12}
                    color={progressFilter === "incomplete" ? "#FFFFFF" : "#2563EB"}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      progressFilter === "incomplete" && styles.filterChipTextActive,
                    ]}
                  >
                    En cours
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, progressFilter === "low" && styles.filterChipActive]}
                  onPress={() => setProgressFilter("low")}
                >
                  <Feather name="trending-down" size={12} color={progressFilter === "low" ? "#FFFFFF" : "#EF4444"} />
                  <Text
                    style={[styles.filterChipText, progressFilter === "low" && styles.filterChipTextActive]}
                  >
                    0-35%
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, progressFilter === "mid" && styles.filterChipActive]}
                  onPress={() => setProgressFilter("mid")}
                >
                  <Feather name="bar-chart-2" size={12} color={progressFilter === "mid" ? "#FFFFFF" : "#F59E0B"} />
                  <Text
                    style={[styles.filterChipText, progressFilter === "mid" && styles.filterChipTextActive]}
                  >
                    35-70%
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, progressFilter === "high" && styles.filterChipActive]}
                  onPress={() => setProgressFilter("high")}
                >
                  <Feather name="trending-up" size={12} color={progressFilter === "high" ? "#FFFFFF" : "#22C55E"} />
                  <Text
                    style={[styles.filterChipText, progressFilter === "high" && styles.filterChipTextActive]}
                  >
                    70-99%
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, progressFilter === "complete" && styles.filterChipActive]}
                  onPress={() => setProgressFilter("complete")}
                >
                  <Feather name="check" size={12} color={progressFilter === "complete" ? "#FFFFFF" : "#16A34A"} />
                  <Text
                    style={[styles.filterChipText, progressFilter === "complete" && styles.filterChipTextActive]}
                  >
                    100%
                  </Text>
                </Pressable>
              </View>
              <View style={styles.searchWrap}>
                <View style={[styles.searchBar, styles.searchBarShadow]}>
                  <View style={styles.searchIconWrap}>
                    <Feather name="search" size={16} color="#2563EB" />
                  </View>
                  <TextInput
                    placeholder="Rechercher un immeuble"
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                  />
                </View>
              </View>

              {loading && <Text style={styles.helper}>Chargement...</Text>}
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          }
          ListEmptyComponent={
            !loading && !error ? (
              <View style={styles.emptyCard}>
                <Feather name="home" size={32} color="#94A3B8" />
                <Text style={styles.emptyText}>Aucun immeuble trouve</Text>
              </View>
            ) : null
          }
          renderItem={({ item: pair }) => (
            <View style={styles.row}>
              {pair.map((immeuble, index) => {
                const portes = immeuble.portes || [];
                const total = portes.length || immeuble.nbEtages * immeuble.nbPortesParEtage;
                const prospectees = portes.length
                  ? portes.filter((porte) => porte.statut !== "NON_VISITE").length
                  : 0;
                const progressPercent = total === 0 ? 0 : Math.round((prospectees / total) * 100);
                const progressColor =
                  progressPercent < 35
                    ? "#EF4444"
                    : progressPercent < 70
                    ? "#F59E0B"
                    : "#22C55E";
                const cardLabel = `Appartement ${String.fromCharCode(65 + (index % 26))}`;
                return (
                  <Pressable
                    key={immeuble.id}
                    style={styles.card}
                    onPress={() => setSelectedImmeubleId(immeuble.id)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.cardIcon}>
                        <Feather name="home" size={18} color="#2563EB" />
                      </View>
                      <Text style={styles.cardChip}>{cardLabel}</Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text
                        style={[styles.cardTitle, !isTablet && styles.cardTitleCompact]}
                        numberOfLines={2}
                      >
                        {immeuble.adresse}
                      </Text>
                      <View style={styles.cardMetaRow}>
                        <Feather name="grid" size={11} color="#64748B" />
                        <Text style={styles.cardMeta}>{immeuble.nbEtages} etages</Text>
                        <Text style={styles.cardMeta}>•</Text>
                        <Text style={styles.cardMeta}>{total} portes</Text>
                      </View>
                      <View style={styles.progressRow}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${progressPercent}%`, backgroundColor: progressColor },
                            ]}
                          />
                        </View>
                        <Text style={[styles.progressText, { color: progressColor }]}>
                          {progressPercent}%
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
              {pair.length === 1 && <View style={styles.cardPlaceholder} />}
            </View>
          )}
        />

        <Pressable
          style={[styles.fab, { bottom: insets.bottom + 72 }]}
          onPress={() => setIsAddOpen(true)}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>

        <AddImmeubleSheet
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          loading={creating}
          ownerId={userId}
          ownerRole={role}
          onSave={async (payload) => {
            const result = await create(payload);
            if (result) {
              console.log("[Immeuble] added", result.id);
              setIsAddOpen(false);
              setRefreshTick((prev) => prev + 1);
            } else {
              console.log("[Immeuble] add failed");
            }
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 18,
    paddingBottom: 24,
  },
  headerBlock: {
    gap: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  searchWrap: {
    alignItems: "center",
  },
  searchBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#D7E0F0",
  },
  searchBarShadow: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E0EDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCardPrimary: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#2563EB",
  },
  summaryCardSecondary: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryIconPrimary: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIconSecondary: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    color: "#DBEAFE",
  },
  summaryValueSecondary: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryLabelSecondary: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
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
    borderRadius: 999,
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
    width: "45%",
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  skeletonSubtitle: {
    width: "60%",
    height: 14,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  skeletonSummaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonSummaryCard: {
    flex: 1,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  skeletonSearch: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 160,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardPlaceholder: {
    flex: 1,
    maxWidth: 360,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  cardContent: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardTitleCompact: {
    fontSize: 14,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  cardMeta: {
    fontSize: 13,
    color: "#64748B",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 6,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
