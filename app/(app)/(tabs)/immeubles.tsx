import AddImmeubleSheet from "@/components/immeubles/AddImmeubleSheet";
import ImmeubleDetailsView from "@/components/immeubles/ImmeubleDetailsScreen";
import { useCreateImmeuble } from "@/hooks/api/use-create-immeuble";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Immeuble } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onHamburgerVisibilityChange?: (visible: boolean) => void;
  onHeaderVisibilityChange?: (visible: boolean) => void;
};

type ListRow = { _type: "controls" } | Immeuble[];

const CONTROLS_ROW_HEIGHT = 170;
const DATA_ROW_HEIGHT = 208;

const FILTER_CHIPS: {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}[] = [
  { key: "all", label: "Tous", icon: "layers", color: "#2563EB" },
  {
    key: "incomplete",
    label: "En cours",
    icon: "activity",
    color: "#2563EB",
  },
  { key: "low", label: "0-35%", icon: "trending-down", color: "#EF4444" },
  { key: "mid", label: "35-70%", icon: "bar-chart-2", color: "#F59E0B" },
  { key: "high", label: "70-99%", icon: "trending-up", color: "#22C55E" },
  { key: "complete", label: "100%", icon: "check", color: "#16A34A" },
];

export default function ImmeublesScreen({
  isActive = true,
  onSwipeLockChange,
  onHamburgerVisibilityChange,
  onHeaderVisibilityChange,
}: ImmeublesScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const filterChipAnimsRef = useRef(new Map<string, Animated.Value>()).current;
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [progressFilter, setProgressFilter] = useState("incomplete");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedImmeubleId, setSelectedImmeubleId] = useState<number | null>(
    null,
  );
  const [detailsDirty, setDetailsDirty] = useState(false);
  const cardAnimationsRef = useRef<Map<number, Animated.Value>>(new Map());
  const hasAnimatedOnce = useRef(false);
  const ANIMATED_CARD_LIMIT = 12;
  const listOpacity = useRef(new Animated.Value(1)).current;
  const listTranslate = useRef(new Animated.Value(0)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;
  const detailsTranslate = useRef(new Animated.Value(24)).current;
  const [isExitingDetails, setIsExitingDetails] = useState(false);

  const getFilterChipAnim = (key: string) => {
    const existing = filterChipAnimsRef.get(key);
    if (existing) return existing;
    const next = new Animated.Value(0);
    filterChipAnimsRef.set(key, next);
    return next;
  };

  const handleFilterToggle = () => {
    if (showFilters) {
      const animations = FILTER_CHIPS.map((chip, index) =>
        Animated.timing(getFilterChipAnim(chip.key), {
          toValue: 0,
          duration: 160,
          delay: index * 20,
          useNativeDriver: true,
        }),
      );
      Animated.stagger(20, animations).start(() => {
        setShowFilters(false);
        setFiltersVisible(false);
      });
      return;
    }

    setShowFilters(true);
    setFiltersVisible(true);
    FILTER_CHIPS.forEach((chip) => getFilterChipAnim(chip.key).setValue(0));
    const animations = FILTER_CHIPS.map((chip, index) =>
      Animated.spring(getFilterChipAnim(chip.key), {
        toValue: 1,
        friction: 6,
        tension: 90,
        delay: index * 30,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(30, animations).start();
  };

  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useWorkspaceProfile(userId, role);
  const { create, cancel: cancelCreate, loading: creating } = useCreateImmeuble();
  const isProfileReady = userId !== null && role !== null;
  const isInitialLoading = !isProfileReady || (loading && !profile);

  useEffect(() => {
    let isMounted = true;
    const loadProfileMeta = async () => {
      const [nextUserId, nextRole] = await Promise.all([
        authService.getUserId(),
        authService.getUserRole(),
      ]);
      if (!isMounted) return;
      setUserId(nextUserId);
      setRole(nextRole);
    };
    void loadProfileMeta();
    return () => {
      isMounted = false;
    };
  }, []);

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
    const filtered = filteredImmeubles.filter((imm) => {
      const portes = imm.portes || [];
      const prospectees = portes.filter(
        (porte) => porte.statut !== "NON_VISITE",
      ).length;
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
    return [...filtered].sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    });
  }, [filteredImmeubles, progressFilter]);

  const getCardAnimation = (id: number) => {
    const existing = cardAnimationsRef.current.get(id);
    if (existing) return existing;
    const next = new Animated.Value(0);
    cardAnimationsRef.current.set(id, next);
    return next;
  };

  useEffect(() => {
    if (selectedImmeubleId !== null || !isActive) return;
    if (immeublesEnCours.length === 0) return;
    if (hasAnimatedOnce.current) {
      immeublesEnCours.forEach((imm) => {
        getCardAnimation(imm.id).setValue(1);
      });
      return;
    }
    hasAnimatedOnce.current = true;
    const animatedItems = immeublesEnCours.slice(0, ANIMATED_CARD_LIMIT);
    const staticItems = immeublesEnCours.slice(ANIMATED_CARD_LIMIT);
    animatedItems.forEach((imm) => {
      getCardAnimation(imm.id).setValue(0);
    });
    staticItems.forEach((imm) => {
      getCardAnimation(imm.id).setValue(1);
    });
    const animations = animatedItems.map((imm, index) =>
      Animated.spring(getCardAnimation(imm.id), {
        toValue: 1,
        friction: 6,
        tension: 90,
        delay: index * 30,
        useNativeDriver: true,
      }),
    );
    Animated.stagger(30, animations).start();
  }, [ANIMATED_CARD_LIMIT, immeublesEnCours, isActive, selectedImmeubleId]);

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

  const immeublePairs = useMemo(() => {
    const pairs: Immeuble[][] = [];
    for (let i = 0; i < immeublesEnCours.length; i += 2) {
      pairs.push(immeublesEnCours.slice(i, i + 2));
    }
    return pairs;
  }, [immeublesEnCours]);

  const listData = useMemo<ListRow[]>(
    () => [{ _type: "controls" }, ...immeublePairs],
    [immeublePairs],
  );

  const getRowKey = useCallback((row: ListRow, index: number) => {
    if (!Array.isArray(row)) {
      return `controls-${index}`;
    }
    return row.map((immeuble) => String(immeuble.id)).join("-");
  }, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<ListRow> | null | undefined, index: number) => {
      if (index === 0) {
        return { length: CONTROLS_ROW_HEIGHT, offset: 0, index };
      }
      return {
        length: DATA_ROW_HEIGHT,
        offset: CONTROLS_ROW_HEIGHT + (index - 1) * DATA_ROW_HEIGHT,
        index,
      };
    },
    [],
  );

  const progressByImmeubleId = useMemo(() => {
    const entries: Record<
      number,
      { total: number; prospectees: number; progressPercent: number; progressColor: string }
    > = {};

    for (const immeuble of immeublesEnCours) {
      const portes = immeuble.portes || [];
      const total = portes.length || immeuble.nbEtages * immeuble.nbPortesParEtage;
      const prospectees = portes.length
        ? portes.filter((porte) => porte.statut !== "NON_VISITE").length
        : 0;
      const progressPercent =
        total === 0 ? 0 : Math.round((prospectees / total) * 100);
      const progressColor =
        progressPercent < 35
          ? "#EF4444"
          : progressPercent < 70
            ? "#F59E0B"
            : "#22C55E";

      entries[immeuble.id] = {
        total,
        prospectees,
        progressPercent,
        progressColor,
      };
    }

    return entries;
  }, [immeublesEnCours]);

  const handleOpenImmeuble = useCallback(
    (immeubleId: number) => {
      onHeaderVisibilityChange?.(false);
      onHamburgerVisibilityChange?.(false);
      onSwipeLockChange?.(true);
      setSelectedImmeubleId(immeubleId);
    },
    [onHamburgerVisibilityChange, onHeaderVisibilityChange, onSwipeLockChange],
  );

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

  const handleCloseDetails = useCallback(() => {
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
      onSwipeLockChange?.(false);
      onHamburgerVisibilityChange?.(true);
      onHeaderVisibilityChange?.(true);
      setIsExitingDetails(false);
      if (detailsDirty) {
        void refetch();
        setDetailsDirty(false);
      }
    });
  }, [
    detailsDirty,
    detailsOpacity,
    detailsTranslate,
    isExitingDetails,
    onHamburgerVisibilityChange,
    onHeaderVisibilityChange,
    onSwipeLockChange,
    refetch,
  ]);

  const handleRefreshImmeuble = useCallback(() => {
    void refetch();
  }, [refetch]);

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
          onBack={handleCloseDetails}
          onDirtyChange={setDetailsDirty}
          onRefreshImmeuble={handleRefreshImmeuble}
        />
      </Animated.View>
    );
  }

  if (isInitialLoading) {
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
        <FlatList<ListRow>
          data={listData}
          windowSize={7}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={24}
          removeClippedSubviews
          keyExtractor={getRowKey}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.content}
          stickyHeaderIndices={[1]}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCardPrimary}>
                  <View style={styles.summaryIconPrimary}>
                    <Feather name="layers" size={16} color="#FFFFFF" />
                  </View>
                  <Text style={styles.summaryValue}>
                    {immeublesEnCours.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Immeubles a finir</Text>
                </View>
                <View style={styles.summaryCardSecondary}>
                  <View style={styles.summaryIconSecondary}>
                    <Feather name="grid" size={16} color="#2563EB" />
                  </View>
                  <Text style={styles.summaryValueSecondary}>
                    {totalPortes}
                  </Text>
                  <Text style={styles.summaryLabelSecondary}>
                    Portes totales
                  </Text>
                </View>
              </View>

              {loading && !profile && <Text style={styles.helper}>Chargement...</Text>}
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
          renderItem={({ item: row }) =>
            !Array.isArray(row) ? (
              <View style={styles.controlsSticky}>
                {!isSearchFocused && filtersVisible && (
                  <View style={styles.filterRow}>
                    {FILTER_CHIPS.map((chip) => {
                      const selected = progressFilter === chip.key;
                      const anim = getFilterChipAnim(chip.key);
                      return (
                        <Animated.View
                          key={chip.key}
                          style={{
                            opacity: anim,
                            transform: [
                              {
                                translateY: anim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [16, 0],
                                }),
                              },
                              {
                                translateX: anim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [12, 0],
                                }),
                              },
                              {
                                scale: anim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1],
                                }),
                              },
                            ],
                          }}
                        >
                          <Pressable
                            style={[
                              styles.filterChip,
                              selected && styles.filterChipActive,
                            ]}
                            onPress={() => setProgressFilter(chip.key)}
                          >
                            <Feather
                              name={chip.icon}
                              size={12}
                              color={selected ? "#FFFFFF" : chip.color}
                            />
                            <Text
                              style={[
                                styles.filterChipText,
                                selected && styles.filterChipTextActive,
                              ]}
                            >
                              {chip.label}
                            </Text>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                )}
                <View style={styles.searchWrapRow}>
                  <View
                    style={[
                      styles.searchBar,
                      styles.searchBarShadow,
                      isSearchFocused && styles.searchBarFocused,
                    ]}
                  >
                    <View style={styles.searchIconWrap}>
                      <Feather name="search" size={18} color="#2563EB" />
                    </View>
                    <TextInput
                      ref={searchInputRef}
                      placeholder="Rechercher un immeuble, adresse, ville?"
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInput}
                      value={query}
                      onChangeText={setQuery}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                    />
                    {query.length > 0 && (
                      <Pressable
                        style={styles.clearButton}
                        onPress={() => {
                          setQuery("");
                          searchInputRef.current?.focus();
                        }}
                      >
                        <Feather name="x" size={14} color="#64748B" />
                      </Pressable>
                    )}
                    <Pressable
                      style={styles.filterButton}
                      onPress={handleFilterToggle}
                    >
                      <Feather name="sliders" size={16} color="#2563EB" />
                    </Pressable>
                  </View>
                  {isSearchFocused && (
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        setQuery("");
                        setIsSearchFocused(false);
                        searchInputRef.current?.blur();
                      }}
                    >
                      <Text style={styles.cancelText}>Annuler</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.row}>
                {row.map((immeuble, index) => {
                   const progress = progressByImmeubleId[immeuble.id] ?? {
                     total: 0,
                     prospectees: 0,
                     progressPercent: 0,
                     progressColor: "#22C55E",
                   };
                   const cardLabel = `Appartement ${String.fromCharCode(65 + (index % 26))}`;
                   const anim = getCardAnimation(immeuble.id);
                   const animValue = anim;
                  return (
                    <Animated.View
                      key={immeuble.id}
                      style={[
                        styles.cardWrap,
                        {
                          opacity: animValue,
                          transform: [
                            {
                              translateY: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [16, 0],
                              }),
                            },
                            {
                              translateX: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [12, 0],
                              }),
                            },
                            {
                              scale: animValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.96, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                       <Pressable
                         style={styles.card}
                         onPress={() => handleOpenImmeuble(immeuble.id)}
                       >
                        <View style={styles.cardHeader}>
                          <View style={styles.cardIcon}>
                            <Feather name="home" size={18} color="#2563EB" />
                          </View>
                          <Text style={styles.cardChip}>{cardLabel}</Text>
                        </View>
                        <View style={styles.cardContent}>
                          <Text
                            style={[
                              styles.cardTitle,
                              !isTablet && styles.cardTitleCompact,
                            ]}
                            numberOfLines={2}
                          >
                            {immeuble.adresse}
                          </Text>
                          <View style={styles.cardMetaRow}>
                            <Feather name="grid" size={11} color="#64748B" />
                            <Text style={styles.cardMeta}>
                              {immeuble.nbEtages} etages
                            </Text>
                            <Text style={styles.cardMeta}>•</Text>
                             <Text style={styles.cardMeta}>{progress.total} portes</Text>
                          </View>
                          <View style={styles.progressRow}>
                            <View style={styles.progressTrack}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                      width: `${progress.progressPercent}%`,
                                      backgroundColor: progress.progressColor,
                                    },
                                  ]}
                               />
                            </View>
                            <Text
                              style={[
                                 styles.progressText,
                                 { color: progress.progressColor },
                               ]}
                             >
                               {progress.progressPercent}%
                             </Text>
                           </View>
                         </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
                {row.length === 1 && <View style={styles.cardPlaceholder} />}
              </View>
            )
          }
        />

        <Pressable
          style={[styles.fab, { bottom: insets.bottom + 72 }]}
          onPress={() => setIsAddOpen(true)}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>

        <AddImmeubleSheet
          open={isAddOpen}
          onClose={() => {
            cancelCreate();
            setIsAddOpen(false);
          }}
          loading={creating}
          ownerId={userId}
          ownerRole={role}
          onSave={async (payload) => {
            const result = await create(payload);
            if (result) {
              console.log("[Immeuble] added", result.id);
              await refetch();
              setQuery("");
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchBarShadow: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#E0EDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    paddingVertical: 2,
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
  filterRowAnimated: {
    overflow: "hidden",
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
  cardWrap: {
    flex: 1,
    maxWidth: 380,
  },
  card: {
    flex: 1,
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
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
    maxWidth: 380,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardTitleCompact: {
    fontSize: 15,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  cardMeta: {
    fontSize: 14,
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
  controlsSticky: {
    backgroundColor: "#F8FAFC",
    paddingBottom: 12,
    gap: 12,
  },
  searchWrapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBarFocused: {
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#2563EB",
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
});
