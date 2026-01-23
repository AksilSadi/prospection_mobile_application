import type { Immeuble, Porte } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
    value: "ABSENT",
    label: "Absent",
    description: "Pas repondu",
    bg: "#FFF7ED",
    fg: "#9A3412",
    accent: "#FB923C",
    icon: "alert-circle",
  },
  {
    value: "REFUS",
    label: "Refus",
    description: "Aucun interet",
    bg: "#FEF2F2",
    fg: "#9F1239",
    accent: "#FB7185",
    icon: "x-circle",
  },
  {
    value: "RENDEZ_VOUS_PRIS",
    label: "RDV pris",
    description: "Planifie",
    bg: "#EFF6FF",
    fg: "#1D4ED8",
    accent: "#60A5FA",
    icon: "calendar",
  },
  {
    value: "ARGUMENTE",
    label: "Argumente",
    description: "Discussion ok",
    bg: "#F5F3FF",
    fg: "#6D28D9",
    accent: "#A78BFA",
    icon: "message-square",
  },
  {
    value: "CONTRAT_SIGNE",
    label: "Contrat signe",
    description: "Success",
    bg: "#ECFDF3",
    fg: "#15803D",
    accent: "#34D399",
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
        const cardBg = isActive ? option.accent : option.bg;
        const cardBorder = isActive ? option.accent : "#E5E5EA";
        const labelColor = isActive ? "#FFFFFF" : option.fg;
        const descColor = isActive ? "rgba(255, 255, 255, 0.9)" : option.fg;
        const iconBg = isActive ? "rgba(255, 255, 255, 0.2)" : option.accent;
        const iconColor = isActive ? "#FFFFFF" : option.fg;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.statusCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
            onPress={() => onSelect(option.value)}
          >
            <View style={[styles.statusIcon, { backgroundColor: iconBg }]}>
              <Feather name={option.icon} size={18} color={iconColor} />
            </View>
            <Text style={[styles.statusLabel, { color: labelColor }]}>
              {option.label}
            </Text>
            <Text style={[styles.statusDesc, { color: descColor }]}>
              {option.description}
            </Text>
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
  const [actionToast, setActionToast] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(-12)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (immeuble.portes?.length) {
      setPortesState(immeuble.portes);
    } else {
      setPortesState(buildFallbackPortes(immeuble));
    }
    setCurrentIndex(0);
  }, [immeuble]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (title: string, subtitle: string) => {
    setActionToast({ title, subtitle });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(toastTranslate, {
        toValue: 0,
        useNativeDriver: true,
        friction: 7,
        tension: 80,
      }),
    ]).start();
    toastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslate, {
          toValue: -8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setActionToast(null);
      });
    }, 1400);
  };

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
  const currentStatus = STATUS_OPTIONS.find(
    (option) => option.value === currentPorte?.statut,
  ) ?? {
    value: "NON_VISITE",
    label: "Non visite",
    description: "Par defaut",
    bg: "#E2E8F0",
    fg: "#475569",
    accent: "#CBD5F5",
    icon: "circle" as const,
  };

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

  const noop = () => {};

  const handleStatusSelect = (statut: string) => {
    if (!currentPorte) return;
    const selectedStatus =
      STATUS_OPTIONS.find((option) => option.value === statut)?.label ??
      "Mis a jour";
    showToast(
      `Porte ${currentPorte.nomPersonnalise || currentPorte.numero}`,
      `Statut: ${selectedStatus}`,
    );
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
            {immeuble.nbEtages} etages • {immeuble.nbPortesParEtage}{" "}
            portes/etage
          </Text>
        </View>
      </View>

      {actionToast ? (
        <View style={[styles.toastOverlay, { top: insets.top + 8 }]}>
          <Animated.View
            style={[
              styles.toastCard,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslate }],
              },
            ]}
          >
            <View style={styles.toastIcon}>
              <Feather name="check" size={14} color="#FFFFFF" />
            </View>
            <View style={styles.toastText}>
              <Text style={styles.toastTitle}>{actionToast.title}</Text>
              <Text style={styles.toastSubtitle}>{actionToast.subtitle}</Text>
            </View>
          </Animated.View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressCard}>
          <View style={styles.progressGlow} />
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
          <View style={styles.currentBackdrop} />
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
                {
                  backgroundColor: currentStatus.bg,
                  borderColor: currentStatus.accent,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: currentStatus.accent },
                ]}
              />
              <Text
                style={[styles.statusPillText, { color: currentStatus.fg }]}
              >
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
          <View>
            <Text style={styles.sectionTitle}>Statut de la porte</Text>
            <Text style={styles.sectionHint}>
              Un tap passe automatiquement a la porte suivante.
            </Text>
          </View>
          <StatusGrid
            currentPorte={currentPorte}
            onSelect={handleStatusSelect}
          />
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
          <View style={styles.manageHeaderRow}>
            <Text style={styles.sectionTitle}>Gestion portes & etages</Text>
          </View>
          <View style={styles.manageGrid}>
            <Pressable style={styles.manageButton} onPress={noop}>
              <View style={styles.manageIcon}>
                <Feather name="plus-square" size={18} color="#0F172A" />
              </View>
              <Text style={styles.manageTitle}>Ajouter porte</Text>
            </Pressable>
            <Pressable style={styles.manageButton} onPress={noop}>
              <View style={styles.manageIconDanger}>
                <Feather name="minus-square" size={18} color="#9F1239" />
              </View>
              <Text style={styles.manageTitle}>Supprimer porte</Text>
            </Pressable>
            <Pressable style={styles.manageButton} onPress={noop}>
              <View style={styles.manageIcon}>
                <Feather name="layers" size={18} color="#0F172A" />
              </View>
              <Text style={styles.manageTitle}>Ajouter etage</Text>
            </Pressable>
            <Pressable style={styles.manageButton} onPress={noop}>
              <View style={styles.manageIconDanger}>
                <Feather name="trash-2" size={18} color="#9F1239" />
              </View>
              <Text style={styles.manageTitle}>Supprimer etage</Text>
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
                      ) ?? null;
                    const isActive = porte.id === currentPorte?.id;
                    const isVisited = status !== null;
                    const chipBg = isActive
                      ? isVisited
                        ? status.accent
                        : "#9CA3AF"
                      : isVisited
                        ? status.bg
                        : "#E5E7EB";
                    const chipBorder = isVisited ? status.accent : "#D1D5DB";
                    const chipText = isActive
                      ? "#FFFFFF"
                      : isVisited
                        ? status.fg
                        : "#6B7280";
                    return (
                      <Pressable
                        key={porte.id}
                        style={[
                          styles.doorChip,
                          { backgroundColor: chipBg, borderColor: chipBorder },
                          isActive && styles.doorChipActive,
                        ]}
                        onPress={() => goToPorte(porte.id)}
                      >
                        <Text
                          style={[styles.doorChipText, { color: chipText }]}
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
    backgroundColor: "#F2F2F7",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F2F2F7",
    borderBottomWidth: 1,
    borderColor: "#E5E5EA",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
  toastOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  toastIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#34D399",
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  toastSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.75)",
  },
  progressCard: {
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  progressGlow: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 999,
    right: -30,
    top: -40,
    backgroundColor: "rgba(0, 122, 255, 0.12)",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#007AFF",
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F9FAFB",
  },
  currentCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 12,
  },
  currentBackdrop: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "#E5F0FF",
    opacity: 0.6,
  },
  currentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  currentLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  currentTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    borderColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
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
  manageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  manageChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E5EA",
  },
  manageChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  sectionHint: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
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
    fontWeight: "800",
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
    backgroundColor: "#F2F2F7",
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
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
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
  manageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  manageButton: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingVertical: 14,
    gap: 8,
  },
  manageIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  manageTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  manageIconDanger: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
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
