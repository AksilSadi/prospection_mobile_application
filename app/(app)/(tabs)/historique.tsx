import { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { authService } from "@/services/auth";
import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import type { Immeuble } from "@/types/api";

const FILTERS = [
  { key: "all", label: "Tous" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
];

const PAGE_SIZE = 8;

export default function HistoriqueScreen() {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const visibleImmeubles = filteredImmeubles.slice(0, visibleCount);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Historique</Text>
      <Text style={styles.subtitle}>Immeubles recents</Text>

      <View style={styles.filtersRow}>
        {FILTERS.map(item => {
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

      {!loading && !error && filteredImmeubles.length === 0 && (
        <View style={styles.emptyCard}>
          <Feather name="home" size={32} color="#94A3B8" />
          <Text style={styles.emptyText}>Aucun immeuble pour cette periode</Text>
        </View>
      )}

      {visibleImmeubles.map(immeuble => (
        <View key={immeuble.id} style={styles.card}>
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
      ))}

      {visibleCount < filteredImmeubles.length && (
        <Pressable
          style={styles.loadMoreButton}
          onPress={() => setVisibleCount(prev => prev + PAGE_SIZE)}
        >
          <Text style={styles.loadMoreText}>Afficher plus</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
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
  loadMoreButton: {
    marginTop: 8,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
});
