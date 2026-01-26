import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import type { Immeuble } from "@/types/api";

const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
];

export default function HistoriqueScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

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
            <Text style={styles.pageTitle}>Historique</Text>
            <Text style={styles.subtitle}>Immeubles recents</Text>

            <View style={styles.filtersRow}>
              {FILTERS.map((item) => {
                const selected = item.key === filter;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setFilter(item.key)}
                    style={[styles.filterChip, selected && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {loading && <Text style={styles.helper}>Chargement...</Text>}
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
            </View>
            <Feather name="chevron-right" size={18} color="#CBD5F5" />
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
  subtitle: {
    fontSize: 13,
    color: "#64748B",
  },
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
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
  itemSeparator: {
    height: 8,
  },
});
