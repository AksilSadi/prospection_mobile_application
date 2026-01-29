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

  const immeublePairs = useMemo(() => {
    const pairs: Immeuble[][] = [];
    for (let i = 0; i < filteredImmeubles.length; i += 2) {
      pairs.push(filteredImmeubles.slice(i, i + 2));
    }
    return pairs;
  }, [filteredImmeubles]);

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
                  <Text style={styles.summaryValue}>{immeubles.length}</Text>
                  <Text style={styles.summaryLabel}>Immeubles actifs</Text>
                </View>
                <View style={styles.summaryCardSecondary}>
                  <View style={styles.summaryIconSecondary}>
                    <Feather name="grid" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.summaryValueSecondary}>{totalPortes}</Text>
                  <Text style={styles.summaryLabelSecondary}>Portes totales</Text>
                </View>
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
                const total = immeuble.nbEtages * immeuble.nbPortesParEtage;
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
                      <View style={styles.cardMetaRow}>
                        <Feather
                          name={immeuble.ascenseurPresent ? "check-circle" : "x-circle"}
                          size={11}
                          color={immeuble.ascenseurPresent ? "#16A34A" : "#EF4444"}
                        />
                        <Text style={styles.cardMeta}>
                          {immeuble.ascenseurPresent ? "Ascenseur" : "Sans ascenseur"}
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
    padding: 16,
    paddingBottom: 24,
  },
  headerBlock: {
    gap: 12,
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
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchBarShadow: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
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
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#DBEAFE",
  },
  summaryValueSecondary: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryLabelSecondary: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
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
    borderRadius: 16,
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
    gap: 12,
    marginBottom: 12,
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
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
    maxWidth: 340,
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
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardTitleCompact: {
    fontSize: 13,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748B",
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
