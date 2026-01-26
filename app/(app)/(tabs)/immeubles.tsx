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
    if (!onSwipeLockChange) return;
    onSwipeLockChange(isActive && !!selectedImmeuble);
  }, [isActive, onSwipeLockChange, selectedImmeuble]);

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

  const selectedImmeuble = useMemo(
    () =>
      selectedImmeubleId
        ? immeubles.find((imm) => imm.id === selectedImmeubleId) || null
        : null,
    [immeubles, selectedImmeubleId],
  );

  if (selectedImmeuble) {
    return (
      <ImmeubleDetailsView
        immeuble={selectedImmeuble}
        onBack={() => {
          setSelectedImmeubleId(null);
          if (detailsDirty) {
            void refetch();
            setDetailsDirty(false);
          }
        }}
        onDirtyChange={setDetailsDirty}
      />
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
        data={filteredImmeubles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Immeubles</Text>
            <Text style={styles.subtitle}>Vue globale de vos immeubles</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{immeubles.length}</Text>
                <Text style={styles.summaryLabel}>Immeubles</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {immeubles.reduce(
                    (total, imm) => total + imm.nbEtages * imm.nbPortesParEtage,
                    0,
                  )}
                </Text>
                <Text style={styles.summaryLabel}>Portes totales</Text>
              </View>
            </View>

            <View style={styles.searchWrap}>
              <View
                style={[styles.searchBar, isTablet && styles.searchBarTablet]}
              >
                <Feather name="search" size={16} color="#94A3B8" />
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
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        renderItem={({ item }) => {
          const totalPortes = item.nbEtages * item.nbPortesParEtage;
          return (
            <Pressable
              style={styles.card}
              onPress={() => setSelectedImmeubleId(item.id)}
            >
              <View style={styles.cardIcon}>
                <Feather name="home" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.adresse}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.cardMeta}>{item.nbEtages} etages</Text>
                  <Text style={styles.cardMeta}>{"\u2022"}</Text>
                  <Text style={styles.cardMeta}>
                    {item.nbPortesParEtage} portes/etage
                  </Text>
                  <Text style={styles.cardMeta}>{"\u2022"}</Text>
                  <Text style={styles.cardMeta}>{totalPortes} portes</Text>
                </View>
                <View style={styles.cardMetaRow}>
                  <Feather
                    name={item.ascenseurPresent ? "check-circle" : "x-circle"}
                    size={12}
                    color={item.ascenseurPresent ? "#16A34A" : "#EF4444"}
                  />
                  <Text style={styles.cardMeta}>
                    {item.ascenseurPresent ? "Ascenseur" : "Sans ascenseur"}
                  </Text>
                  {item.digitalCode ? (
                    <>
                      <Text style={styles.cardMeta}>{"\u2022"}</Text>
                      <Text style={styles.cardMeta}>
                        Code {item.digitalCode}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#CBD5F5" />
            </Pressable>
          );
        }}
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
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchBarTablet: {
    maxWidth: 520,
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
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryLabel: {
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    fontSize: 12,
    color: "#94A3B8",
  },
  cardMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  itemSeparator: {
    height: 8,
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
