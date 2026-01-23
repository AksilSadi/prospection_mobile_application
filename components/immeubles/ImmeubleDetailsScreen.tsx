import type { Immeuble, Porte } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type StatusOption = {
  value: string;
  label: string;
  description: string;
  bg: string;
  fg: string;
  accent: string;
  icon: keyof typeof Feather.glyphMap;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "NON_VISITE",
    label: "Non visite",
    description: "A traiter",
    bg: "#E2E8F0",
    fg: "#475569",
    accent: "#CBD5F5",
    icon: "circle",
  },
  {
    value: "ABSENT",
    label: "Absent",
    description: "Pas repondu",
    bg: "#FED7AA",
    fg: "#9A3412",
    accent: "#FDBA74",
    icon: "alert-circle",
  },
  {
    value: "REFUS",
    label: "Refus",
    description: "Aucun interet",
    bg: "#FEE2E2",
    fg: "#991B1B",
    accent: "#FCA5A5",
    icon: "x-circle",
  },
  {
    value: "RENDEZ_VOUS_PRIS",
    label: "RDV pris",
    description: "Planifie",
    bg: "#DBEAFE",
    fg: "#1D4ED8",
    accent: "#93C5FD",
    icon: "calendar",
  },
  {
    value: "ARGUMENTE",
    label: "Argumente",
    description: "Discussion ok",
    bg: "#EDE9FE",
    fg: "#5B21B6",
    accent: "#C4B5FD",
    icon: "message-square",
  },
  {
    value: "CONTRAT_SIGNE",
    label: "Contrat signe",
    description: "Success",
    bg: "#DCFCE7",
    fg: "#166534",
    accent: "#86EFAC",
    icon: "check-circle",
  },
];

const comparePortesDesc = (a: Porte, b: Porte) => {
  const etageDiff = b.etage - a.etage;
  if (etageDiff !== 0) return etageDiff;
  return String(b.numero ?? "").localeCompare(String(a.numero ?? ""), "fr", {
    numeric: true,
    sensitivity: "base",
  });
};

const buildFallbackPortes = (immeuble: Immeuble | null) => {
  if (!immeuble) return [];
  const portes: Porte[] = [];
  if (!immeuble.nbEtages || !immeuble.nbPortesParEtage) return portes;
  for (let etage = immeuble.nbEtages; etage >= 1; etage -= 1) {
    for (let i = 1; i <= immeuble.nbPortesParEtage; i += 1) {
      portes.push({
        id: -(etage * 1000 + i),
        numero: String(i),
        etage,
        immeubleId: immeuble.id,
        statut: "NON_VISITE",
      });
    }
  }
  return portes;
};

function StatusGrid({
  currentPorte,
  onSelect,
}: {
  currentPorte: Porte | undefined;
  onSelect: (statut: string) => void;
}) {
  return (
    <View style={styles.statusGrid}>
      {STATUS_OPTIONS.map((option) => {
        const isActive = currentPorte?.statut === option.value;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.statusCard,
              { backgroundColor: option.bg },
              isActive && {
                borderColor: option.accent,
                shadowColor: option.accent,
              },
            ]}
            onPress={() => onSelect(option.value)}
          >
            <View style={[styles.statusIcon, { backgroundColor: option.accent }]}>
              <Feather name={option.icon} size={18} color={option.fg} />
            </View>
            <Text style={[styles.statusLabel, { color: option.fg }]}>
              {option.label}
            </Text>
            <Text style={[styles.statusDesc, { color: option.fg }]}>
              {option.description}
            </Text>
            {isActive ? (
              <View style={styles.statusActiveBadge}>
                <Feather name="check" size={12} color="#0F172A" />
                <Text style={styles.statusActiveText}>Selectionne</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type ImmeubleDetailsViewProps = {
  immeuble: Immeuble;
  onBack: () => void;
};

export default function ImmeubleDetailsView({
  immeuble,
  onBack,
}: ImmeubleDetailsViewProps) {
  const insets = useSafeAreaInsets();
  const [portesState, setPortesState] = useState<Porte[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (immeuble.portes?.length) {
      setPortesState(immeuble.portes);
    } else {
      setPortesState(buildFallbackPortes(immeuble));
    }
    setCurrentIndex(0);
  }, [immeuble]);

  const sortedPortes = useMemo(
    () => [...portesState].sort(comparePortesDesc),
    [portesState],
  );

  useEffect(() => {
    if (currentIndex >= sortedPortes.length) {
      setCurrentIndex(Math.max(0, sortedPortes.length - 1));
    }
  }, [currentIndex, sortedPortes.length]);

  const currentPorte = sortedPortes[currentIndex];
  const currentStatus =
    STATUS_OPTIONS.find((option) => option.value === currentPorte?.statut) ??
    STATUS_OPTIONS[0];

  const progress = useMemo(() => {
    const total = sortedPortes.length;
    const current = total ? currentIndex + 1 : 0;
    const percentage = total ? Math.round((current / total) * 100) : 0;
    return { total, current, percentage };
  }, [sortedPortes.length, currentIndex]);

  const portesParEtage = useMemo(() => {
    const grouped = new Map<number, Porte[]>();
    sortedPortes.forEach((porte) => {
      if (!grouped.has(porte.etage)) {
        grouped.set(porte.etage, []);
      }
      grouped.get(porte.etage)?.push(porte);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]);
  }, [sortedPortes]);

  const previousFloorTarget = useMemo(() => {
    if (!currentPorte) return null;
    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      if (sortedPortes[i].etage !== currentPorte.etage) {
        return sortedPortes[i].etage;
      }
    }
    return null;
  }, [currentIndex, currentPorte, sortedPortes]);

  const nextFloorTarget = useMemo(() => {
    if (!currentPorte) return null;
    for (let i = currentIndex + 1; i < sortedPortes.length; i += 1) {
      if (sortedPortes[i].etage !== currentPorte.etage) {
        return sortedPortes[i].etage;
      }
    }
    return null;
  }, [currentIndex, currentPorte, sortedPortes]);

  const canGoPreviousFloor = previousFloorTarget !== null;
  const canGoNextFloor = nextFloorTarget !== null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, sortedPortes.length - 1));
  };

  const goToPorte = (porteId: number) => {
    const index = sortedPortes.findIndex((porte) => porte.id === porteId);
    if (index >= 0) setCurrentIndex(index);
  };

  const goToPreviousFloor = () => {
    if (!currentPorte) return;
    const currentFloor = currentPorte.etage;
    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      if (sortedPortes[i].etage !== currentFloor) {
        const targetFloor = sortedPortes[i].etage;
        let targetIndex = i;
        while (
          targetIndex > 0 &&
          sortedPortes[targetIndex - 1].etage === targetFloor
        ) {
          targetIndex -= 1;
        }
        setCurrentIndex(targetIndex);
        return;
      }
    }
  };

  const goToNextFloor = () => {
    if (!currentPorte) return;
    const currentFloor = currentPorte.etage;
    for (let i = currentIndex + 1; i < sortedPortes.length; i += 1) {
      if (sortedPortes[i].etage !== currentFloor) {
        setCurrentIndex(i);
        return;
      }
    }
  };

  const handleStatusSelect = (statut: string) => {
    if (!currentPorte) return;
    setPortesState((prev) =>
      prev.map((porte) =>
        porte.id === currentPorte.id ? { ...porte, statut } : porte,
      ),
    );
    if (currentIndex < sortedPortes.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, sortedPortes.length - 1));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Feather name="chevron-left" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {immeuble.adresse}
          </Text>
          <Text style={styles.headerSubtitle}>
            {immeuble.nbEtages} etages • {immeuble.nbPortesParEtage} portes/etage
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>Progression</Text>
            <Text style={styles.progressValue}>
              Porte {progress.current} / {progress.total}
            </Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{progress.percentage}%</Text>
          </View>
        </View>

        <View style={styles.currentCard}>
          <View style={styles.currentHeader}>
            <View>
              <Text style={styles.currentLabel}>Porte courante</Text>
              <Text style={styles.currentTitle}>
                {currentPorte?.nomPersonnalise || currentPorte?.numero || "--"}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: currentStatus.bg },
              ]}
            >
              <Feather
                name={currentStatus.icon}
                size={12}
                color={currentStatus.fg}
              />
              <Text style={[styles.statusPillText, { color: currentStatus.fg }]}>
                {currentStatus.label}
              </Text>
            </View>
          </View>
          <View style={styles.currentMeta}>
            <Text style={styles.currentMetaText}>
              Etage {currentPorte?.etage ?? "--"}
            </Text>
            <Text style={styles.currentMetaText}>•</Text>
            <Text style={styles.currentMetaText}>
              Statut: {currentStatus.label}
            </Text>
          </View>
          <View style={styles.navRow}>
            <Pressable
              style={[
                styles.navButton,
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={goToPrevious}
              disabled={currentIndex === 0}
            >
              <Feather name="chevron-left" size={18} color="#1E293B" />
              <Text style={styles.navButtonText}>Precedent</Text>
            </Pressable>
            <Pressable
              style={[
                styles.navButton,
                currentIndex >= sortedPortes.length - 1 &&
                  styles.navButtonDisabled,
              ]}
              onPress={goToNext}
              disabled={currentIndex >= sortedPortes.length - 1}
            >
              <Text style={styles.navButtonText}>Suivant</Text>
              <Feather name="chevron-right" size={18} color="#1E293B" />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Statut de la porte</Text>
              <Text style={styles.sectionHint}>
                Un tap sur un statut passe a la porte suivante.
              </Text>
            </View>
            <View style={styles.quickBadge}>
              <Feather name="zap" size={12} color="#0F172A" />
              <Text style={styles.quickBadgeText}>Mode rapide</Text>
            </View>
          </View>
          <StatusGrid currentPorte={currentPorte} onSelect={handleStatusSelect} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Navigation etages</Text>
          <View style={styles.floorNav}>
            <Pressable
              style={[
                styles.floorButton,
                !canGoPreviousFloor && styles.floorButtonDisabled,
              ]}
              onPress={goToPreviousFloor}
              disabled={!canGoPreviousFloor}
            >
              <Feather name="chevrons-left" size={18} color="#1E293B" />
              <View>
                <Text style={styles.floorLabel}>Precedent</Text>
                <Text style={styles.floorValue}>
                  {previousFloorTarget !== null
                    ? `Etage ${previousFloorTarget}`
                    : "--"}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={[
                styles.floorButton,
                !canGoNextFloor && styles.floorButtonDisabled,
              ]}
              onPress={goToNextFloor}
              disabled={!canGoNextFloor}
            >
              <View style={styles.floorButtonRight}>
                <Text style={styles.floorLabel}>Suivant</Text>
                <Text style={styles.floorValue}>
                  {nextFloorTarget !== null ? `Etage ${nextFloorTarget}` : "--"}
                </Text>
              </View>
              <Feather name="chevrons-right" size={18} color="#1E293B" />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan rapide</Text>
          <Text style={styles.sectionHint}>
            Tape une porte pour changer rapidement.
          </Text>
          <View style={styles.mapCard}>
            {portesParEtage.map(([etage, portes]) => (
              <View key={etage} style={styles.mapEtage}>
                <Text style={styles.mapEtageTitle}>Etage {etage}</Text>
                <View style={styles.mapDoors}>
                  {portes.map((porte) => {
                    const status =
                      STATUS_OPTIONS.find(
                        (option) => option.value === porte.statut,
                      ) ?? STATUS_OPTIONS[0];
                    const isActive = porte.id === currentPorte?.id;
                    return (
                      <Pressable
                        key={porte.id}
                        style={[
                          styles.doorChip,
                          { backgroundColor: status.bg, borderColor: status.accent },
                          isActive && styles.doorChipActive,
                        ]}
                        onPress={() => goToPorte(porte.id)}
                      >
                        <Text
                          style={[styles.doorChipText, { color: status.fg }]}
                        >
                          {porte.nomPersonnalise || porte.numero}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  progressValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  currentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  currentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  currentLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  currentTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  currentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentMetaText: {
    fontSize: 12,
    color: "#64748B",
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  section: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionHint: {
    fontSize: 12,
    color: "#94A3B8",
  },
  quickBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
  },
  quickBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: 6,
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusDesc: {
    fontSize: 11,
    opacity: 0.8,
  },
  statusActiveBadge: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    alignSelf: "flex-start",
  },
  statusActiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
  },
  floorNav: {
    flexDirection: "row",
    gap: 12,
  },
  floorButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  floorButtonDisabled: {
    opacity: 0.5,
  },
  floorLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  floorValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  floorButtonRight: {
    alignItems: "flex-end",
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 12,
  },
  mapEtage: {
    gap: 8,
  },
  mapEtageTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  mapDoors: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  doorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  doorChipActive: {
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  doorChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
