import AddPorteSheet, {
  type AddPortePayload,
} from "@/components/immeubles/AddPorteSheet";
import ConfirmActionOverlay from "@/components/immeubles/ConfirmActionOverlay";
import { useUpdatePorte } from "@/hooks/api/use-update-porte";
import type { Immeuble, Porte, UpdatePorteInput } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import type { ComponentType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
type DateTimePickerType = ComponentType<any> | null;

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
    value: "ABSENT_MATIN",
    label: "Absent matin",
    description: "1er passage",
    bg: "#FFFBEB",
    fg: "#92400E",
    accent: "#F59E0B",
    icon: "sun",
  },
  {
    value: "ABSENT_SOIR",
    label: "Absent soir",
    description: "2eme passage",
    bg: "#EFF6FF",
    fg: "#1E3A8A",
    accent: "#2563EB",
    icon: "moon",
  },
  {
    value: "REFUS",
    label: "Refus",
    description: "Aucun interet",
    bg: "#F8FAFC",
    fg: "#0F172A",
    accent: "#EF4444",
    icon: "x-circle",
  },
  {
    value: "RENDEZ_VOUS_PRIS",
    label: "RDV pris",
    description: "Planifie",
    bg: "#EFF6FF",
    fg: "#1E3A8A",
    accent: "#2563EB",
    icon: "calendar",
  },
  {
    value: "ARGUMENTE",
    label: "Argumente",
    description: "Discussion ok",
    bg: "#F8FAFC",
    fg: "#0F172A",
    accent: "#6366F1",
    icon: "message-square",
  },
  {
    value: "CONTRAT_SIGNE",
    label: "Contrat signe",
    description: "Success",
    bg: "#F8FAFC",
    fg: "#0F172A",
    accent: "#22C55E",
    icon: "check-circle",
  },
];

const STATUS_DISPLAY: Record<string, StatusOption> = {
  ...Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option])),
};

const getDisplayStatusKey = (porte?: Porte | null) => {
  if (!porte?.statut) return null;
  if (porte.statut === "ABSENT") {
    const repassages = porte.nbRepassages ?? 1;
    return repassages >= 2 ? "ABSENT_SOIR" : "ABSENT_MATIN";
  }
  return porte.statut;
};

const getDisplayStatus = (porte?: Porte | null) => {
  const key = getDisplayStatusKey(porte);
  return key ? (STATUS_DISPLAY[key] ?? null) : null;
};

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
  const activeKey = getDisplayStatusKey(currentPorte);
  return (
    <View style={styles.statusGrid}>
      {STATUS_OPTIONS.map((option) => {
        const isActive = activeKey === option.value;
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
  onDirtyChange?: (dirty: boolean) => void;
};

export default function ImmeubleDetailsView({
  immeuble,
  onBack,
  onDirtyChange,
}: ImmeubleDetailsViewProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const [portesState, setPortesState] = useState<Porte[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [actionToast, setActionToast] = useState<{
    title: string;
    subtitle: string;
  } | null>(null);
  const [hasLocalUpdates, setHasLocalUpdates] = useState(false);
  const DateTimePicker = useMemo<DateTimePickerType>(() => {
    try {
      return require("@react-native-community/datetimepicker").default;
    } catch {
      return null;
    }
  }, []);
  const hasNativePicker = DateTimePicker !== null;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(-12)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(12)).current;
  const [isReady, setIsReady] = useState(false);
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslate = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const statusTranslate = useRef(new Animated.Value(0)).current;
  const doorPulse = useRef(new Animated.Value(1)).current;
  const { update: updatePorte, loading: savingPorte } = useUpdatePorte();
  const editSheetRef = useRef<BottomSheetModal>(null);
  const editSnapPoints = useMemo(
    () => (isTablet ? ["60%", "85%"] : ["55%", "75%"]),
    [isTablet],
  );
  const [editMode, setEditMode] = useState<
    "RENDEZ_VOUS_PRIS" | "CONTRAT_SIGNE" | null
  >(null);
  const [editPorte, setEditPorte] = useState<Porte | null>(null);
  const [editForm, setEditForm] = useState({
    rdvDate: "",
    rdvTime: "",
    nbContrats: 1,
    commentaire: "",
    nomPersonnalise: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isAddPorteOpen, setIsAddPorteOpen] = useState(false);
  const [addPorteDefaults, setAddPorteDefaults] = useState({
    etage: 1,
    numero: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Porte | null>(null);

  useEffect(() => {
    if (immeuble.portes?.length) {
      setPortesState(immeuble.portes);
    } else {
      setPortesState(buildFallbackPortes(immeuble));
    }
    setCurrentIndex(0);
    setIsReady(false);
    contentOpacity.setValue(0);
    contentTranslate.setValue(12);
    setHasLocalUpdates(false);
    if (onDirtyChange) onDirtyChange(false);
  }, [immeuble]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (portesState.length === 0) return;
    const timeoutId = setTimeout(() => {
      setIsReady(true);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    }, 120);
    return () => clearTimeout(timeoutId);
  }, [portesState.length, contentOpacity, contentTranslate]);

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

  const updateLocalPorte = (porteId: number, changes: Partial<Porte>) => {
    setPortesState((prev) =>
      prev.map((porte) =>
        porte.id === porteId ? { ...porte, ...changes } : porte,
      ),
    );
    setHasLocalUpdates(true);
    if (onDirtyChange) onDirtyChange(true);
  };

  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const getNowTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
  };
  const formatDateLabel = (value: string) => {
    if (!value) return "Choisir une date";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  };
  const formatTimeLabel = (value: string) => {
    if (!value) return "Choisir une heure";
    return value;
  };
  const getDateValue = (value: string) =>
    value ? new Date(`${value}T00:00:00`) : new Date();
  const getTimeValue = (value: string) => {
    if (!value) return new Date();
    const [hh, mm] = value.split(":");
    const now = new Date();
    now.setHours(Number(hh) || 0);
    now.setMinutes(Number(mm) || 0);
    now.setSeconds(0);
    return now;
  };

  const openEditSheet = (
    porte: Porte,
    mode: "RENDEZ_VOUS_PRIS" | "CONTRAT_SIGNE",
  ) => {
    setEditPorte(porte);
    setEditMode(mode);
    setEditForm({
      rdvDate: porte.rdvDate || getTodayDate(),
      rdvTime: porte.rdvTime || getNowTime(),
      nbContrats: porte.nbContrats || 1,
      commentaire: porte.commentaire || "",
      nomPersonnalise: porte.nomPersonnalise || "",
    });
    editSheetRef.current?.present();
  };

  const closeEditSheet = () => {
    editSheetRef.current?.dismiss();
    setEditPorte(null);
    setEditMode(null);
  };

  const saveEditSheet = async () => {
    if (!editPorte || !editMode || savingPorte) return;
    const payload: UpdatePorteInput = {
      id: editPorte.id,
      statut: editMode,
      commentaire: editForm.commentaire.trim() || null,
      nomPersonnalise: editForm.nomPersonnalise.trim() || null,
      derniereVisite: new Date().toISOString(),
    };
    if (editMode === "RENDEZ_VOUS_PRIS") {
      payload.rdvDate = editForm.rdvDate || getTodayDate();
      payload.rdvTime = editForm.rdvTime || null;
    }
    if (editMode === "CONTRAT_SIGNE") {
      payload.nbContrats = editForm.nbContrats || 1;
    }

    updateLocalPorte(editPorte.id, {
      statut: editMode,
      commentaire: payload.commentaire || null,
      nomPersonnalise: payload.nomPersonnalise || null,
      rdvDate: payload.rdvDate ?? editPorte.rdvDate,
      rdvTime: payload.rdvTime ?? editPorte.rdvTime,
      nbContrats: payload.nbContrats ?? editPorte.nbContrats,
      derniereVisite: payload.derniereVisite,
    });

    const result = await updatePorte(payload);
    if (!result) {
      showToast("Erreur", "Mise a jour impossible");
      return;
    }

    showToast(
      `Porte ${editPorte.nomPersonnalise || editPorte.numero}`,
      editMode === "RENDEZ_VOUS_PRIS"
        ? "Rendez-vous enregistre"
        : "Contrat signe",
    );
    closeEditSheet();
    if (currentIndex < sortedPortes.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, sortedPortes.length - 1));
    }
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

  useEffect(() => {
    if (sortedPortes.length === 0) return;
    cardOpacity.setValue(0);
    cardTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslate, currentIndex, sortedPortes.length]);

  useEffect(() => {
    if (sortedPortes.length === 0) return;
    statusOpacity.setValue(0);
    statusTranslate.setValue(10);
    Animated.parallel([
      Animated.timing(statusOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(statusTranslate, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex, sortedPortes.length, statusOpacity, statusTranslate]);

  useEffect(() => {
    if (!currentPorte?.id) return;
    doorPulse.setValue(0.92);
    Animated.spring(doorPulse, {
      toValue: 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [currentPorte?.id, doorPulse]);

  const currentPorte = sortedPortes[currentIndex];
  const currentStatus = getDisplayStatus(currentPorte) ?? {
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
    const visited = sortedPortes.filter(
      (porte) => porte.statut && porte.statut !== "NON_VISITE",
    ).length;
    const percentage = total ? Math.round((visited / total) * 100) : 0;
    return { total, visited, percentage };
  }, [sortedPortes]);

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

  const getNextDoorNumber = (etage: number) => {
    const portesOnFloor = portesState.filter((porte) => porte.etage === etage);
    const numbers = portesOnFloor
      .map((porte) => Number(porte.numero))
      .filter((value) => !Number.isNaN(value));
    if (numbers.length > 0) {
      return String(Math.max(...numbers) + 1);
    }
    return String(portesOnFloor.length + 1);
  };

  const openAddPorte = () => {
    const etage = currentPorte?.etage ?? immeuble.nbEtages ?? 1;
    const numero = getNextDoorNumber(etage);
    setAddPorteDefaults({ etage, numero });
    setIsAddPorteOpen(true);
  };

  const handleAddPorte = (payload: AddPortePayload) => {
    const tempId = -Date.now();
    const newPorte: Porte = {
      id: tempId,
      numero: payload.numero,
      nomPersonnalise: payload.nomPersonnalise || null,
      etage: payload.etage,
      immeubleId: immeuble.id,
      statut: "NON_VISITE",
      nbRepassages: 0,
      nbContrats: 0,
      rdvDate: null,
      rdvTime: null,
      commentaire: null,
      derniereVisite: null,
    };
    setPortesState((prev) => [...prev, newPorte]);
    setHasLocalUpdates(true);
    if (onDirtyChange) onDirtyChange(true);
    showToast(
      "Porte ajoutee",
      `Etage ${payload.etage} • Porte ${payload.numero}`,
    );
    setIsAddPorteOpen(false);
  };

  const openDeletePorte = () => {
    if (!currentPorte) {
      showToast("Aucune porte", "Impossible de supprimer");
      return;
    }
    setDeleteTarget(currentPorte);
  };

  const confirmDeletePorte = () => {
    if (!deleteTarget) return;
    setPortesState((prev) =>
      prev.filter((porte) => porte.id !== deleteTarget.id),
    );
    setHasLocalUpdates(true);
    if (onDirtyChange) onDirtyChange(true);
    setCurrentIndex((prev) =>
      Math.max(0, Math.min(prev, sortedPortes.length - 2)),
    );
    showToast(
      "Porte supprimee",
      deleteTarget.nomPersonnalise
        ? deleteTarget.nomPersonnalise
        : `Porte ${deleteTarget.numero}`,
    );
    setDeleteTarget(null);
  };

  const noop = () => {};

  const applyStatus = async (
    porte: Porte,
    statut: string,
    extra?: { nbRepassages?: number },
  ) => {
    const displayKey =
      statut === "ABSENT" && typeof extra?.nbRepassages === "number"
        ? extra.nbRepassages >= 2
          ? "ABSENT_SOIR"
          : "ABSENT_MATIN"
        : statut;
    const selectedStatus = STATUS_DISPLAY[displayKey]?.label ?? "Mis a jour";
    showToast(
      `Porte ${porte.nomPersonnalise || porte.numero}`,
      `Statut: ${selectedStatus}`,
    );
    const visitedAt = new Date().toISOString();
    updateLocalPorte(porte.id, {
      statut,
      nbRepassages: extra?.nbRepassages,
      derniereVisite: visitedAt,
    });
    const payload: UpdatePorteInput = {
      id: porte.id,
      statut,
      derniereVisite: visitedAt,
      commentaire: porte.commentaire || null,
    };
    if (typeof extra?.nbRepassages === "number") {
      payload.nbRepassages = extra.nbRepassages;
    }
    const result = await updatePorte(payload);
    if (!result) {
      showToast("Erreur", "Mise a jour impossible");
    }
    if (currentIndex < sortedPortes.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, sortedPortes.length - 1));
    }
  };

  const handleStatusSelect = async (statut: string) => {
    if (!currentPorte) return;
    if (statut === "RENDEZ_VOUS_PRIS" || statut === "CONTRAT_SIGNE") {
      openEditSheet(currentPorte, statut);
      return;
    }
    if (statut === "ABSENT_MATIN") {
      await applyStatus(currentPorte, "ABSENT", { nbRepassages: 1 });
      return;
    }
    if (statut === "ABSENT_SOIR") {
      const nextRepassage = Math.max(2, currentPorte.nbRepassages ?? 0);
      await applyStatus(currentPorte, "ABSENT", {
        nbRepassages: nextRepassage,
      });
      return;
    }
    await applyStatus(currentPorte, statut);
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

      {!isReady ? (
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCardTall} />
          <View style={styles.skeletonCardTall} />
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.contentAnimated,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.progressCard}>
            <View style={styles.progressGlow} />
            <View>
              <Text style={styles.progressLabel}>Portes visitees</Text>
              <Text style={styles.progressValue}>
                {progress.visited} / {progress.total}
              </Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {progress.percentage}%
              </Text>
            </View>
          </View>

          <Animated.View
            style={[
              styles.currentCard,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslate }],
              },
            ]}
          >
            <View style={styles.currentBackdrop} />
            <View style={styles.currentHeader}>
              <View>
                <Text style={styles.currentLabel}>Porte courante</Text>
                <Text style={styles.currentTitle}>
                  {currentPorte?.nomPersonnalise ||
                    currentPorte?.numero ||
                    "--"}
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
          </Animated.View>

          <View style={styles.section}>
            <View>
              <Text style={styles.sectionTitle}>Statut de la porte</Text>
              <Text style={styles.sectionHint}>
                Un tap passe automatiquement a la porte suivante.
              </Text>
            </View>
            <Animated.View
              style={{
                opacity: statusOpacity,
                transform: [{ translateY: statusTranslate }],
              }}
            >
              <StatusGrid
                currentPorte={currentPorte}
                onSelect={handleStatusSelect}
              />
            </Animated.View>
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
                    {nextFloorTarget !== null
                      ? `Etage ${nextFloorTarget}`
                      : "--"}
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
              <Pressable style={styles.manageButton} onPress={openAddPorte}>
                <View style={styles.manageIcon}>
                  <Feather name="plus-square" size={18} color="#0F172A" />
                </View>
                <Text style={styles.manageTitle}>Ajouter porte</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.manageButton,
                  !currentPorte && styles.manageButtonDisabled,
                ]}
                onPress={openDeletePorte}
                disabled={!currentPorte}
              >
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
                      const status = getDisplayStatus(porte);
                      const isActive = porte.id === currentPorte?.id;
                      const isVisited = status !== null;
                      const chipBg = isVisited ? status.accent : "#E2E8F0";
                      const chipBorder = "transparent";
                      const chipText = isVisited ? "#FFFFFF" : "#64748B";
                      return (
                        <Animated.View
                          key={porte.id}
                          style={{
                            transform: [{ scale: isActive ? doorPulse : 1 }],
                          }}
                        >
                          <Pressable
                            style={[
                              styles.doorChip,
                              {
                                backgroundColor: chipBg,
                                borderColor: chipBorder,
                              },
                              isActive && styles.doorChipActive,
                            ]}
                            onPress={() => goToPorte(porte.id)}
                          >
                            <View style={styles.doorChipContent}>
                              <Text
                                style={[
                                  styles.doorChipText,
                                  { color: chipText },
                                ]}
                              >
                                {porte.nomPersonnalise || porte.numero}
                              </Text>
                              {isActive ? (
                                <View style={styles.activeDot} />
                              ) : null}
                            </View>
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <BottomSheetModal
        ref={editSheetRef}
        index={1}
        snapPoints={editSnapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.45}
          />
        )}
        enablePanDownToClose
        onDismiss={closeEditSheet}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            isTablet && styles.sheetContentTablet,
          ]}
        >
          <>
            <View
              style={[
                styles.sheetHero,
                editMode === "RENDEZ_VOUS_PRIS"
                  ? styles.sheetHeroRdv
                  : styles.sheetHeroContract,
                isTablet && styles.sheetHeroTablet,
              ]}
            >
              <View
                style={[
                  styles.sheetHeroIcon,
                  editMode === "RENDEZ_VOUS_PRIS"
                    ? styles.sheetHeroIconBlue
                    : styles.sheetHeroIconGreen,
                ]}
              >
                <Feather
                  name={editMode === "RENDEZ_VOUS_PRIS" ? "calendar" : "award"}
                  size={18}
                  color={
                    editMode === "RENDEZ_VOUS_PRIS" ? "#1D4ED8" : "#047857"
                  }
                />
              </View>
              <View style={styles.sheetHeroText}>
                <Text
                  style={[
                    styles.sheetTitle,
                    isTablet && styles.sheetTitleTablet,
                  ]}
                >
                  {editMode === "RENDEZ_VOUS_PRIS"
                    ? "Rendez-vous"
                    : "Contrat signe"}
                </Text>
                <Text
                  style={[
                    styles.sheetSubtitle,
                    isTablet && styles.sheetSubtitleTablet,
                  ]}
                >
                  {editPorte?.nomPersonnalise ||
                    `Porte ${editPorte?.numero || ""}`}
                </Text>
              </View>
            </View>

            <View
              style={[styles.sheetCard, isTablet && styles.sheetCardTablet]}
            >
              <Text style={styles.sheetLabel}>Nom personnalise</Text>
              <View style={styles.inputRow}>
                <Feather name="edit-3" size={16} color="#6B7280" />
                <TextInput
                  placeholder={`Porte ${editPorte?.numero || ""}`}
                  value={editForm.nomPersonnalise}
                  onChangeText={(value) =>
                    setEditForm((prev) => ({
                      ...prev,
                      nomPersonnalise: value,
                    }))
                  }
                  style={styles.inputInline}
                />
              </View>
            </View>

            {editMode === "RENDEZ_VOUS_PRIS" && (
              <View
                style={[
                  styles.sheetCard,
                  styles.sheetCardRdv,
                  isTablet && styles.sheetCardTablet,
                ]}
              >
                <Text style={styles.sheetLabel}>Quand</Text>
                {hasNativePicker ? (
                  <>
                    <Pressable
                      style={styles.pickerRow}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <View style={styles.pickerIcon}>
                        <Feather name="calendar" size={16} color="#1D4ED8" />
                      </View>
                      <View style={styles.pickerText}>
                        <Text style={styles.pickerTitle}>Date</Text>
                        <Text style={styles.pickerValue}>
                          {formatDateLabel(editForm.rdvDate)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color="#94A3B8" />
                    </Pressable>
                    <Pressable
                      style={styles.pickerRow}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <View style={styles.pickerIcon}>
                        <Feather name="clock" size={16} color="#1D4ED8" />
                      </View>
                      <View style={styles.pickerText}>
                        <Text style={styles.pickerTitle}>Heure</Text>
                        <Text style={styles.pickerValue}>
                          {formatTimeLabel(editForm.rdvTime)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color="#94A3B8" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.sheetHint}>
                      Activez le DatePicker natif pour une meilleure experience.
                    </Text>
                    <View style={styles.inputRow}>
                      <Feather name="calendar" size={16} color="#6B7280" />
                      <TextInput
                        placeholder="YYYY-MM-DD"
                        value={editForm.rdvDate}
                        onChangeText={(value) =>
                          setEditForm((prev) => ({ ...prev, rdvDate: value }))
                        }
                        style={styles.inputInline}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={[styles.inputRow, styles.inputRowSpacing]}>
                      <Feather name="clock" size={16} color="#6B7280" />
                      <TextInput
                        placeholder="HH:mm"
                        value={editForm.rdvTime}
                        onChangeText={(value) =>
                          setEditForm((prev) => ({ ...prev, rdvTime: value }))
                        }
                        style={styles.inputInline}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {editMode === "CONTRAT_SIGNE" && (
              <View
                style={[
                  styles.sheetCard,
                  styles.sheetCardContract,
                  isTablet && styles.sheetCardTablet,
                ]}
              >
                <Text style={styles.sheetLabel}>Contrats signes</Text>
                <View style={styles.counterRow}>
                  <Pressable
                    style={styles.counterButton}
                    onPress={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        nbContrats: Math.max(1, prev.nbContrats - 1),
                      }))
                    }
                  >
                    <Feather name="minus" size={16} color="#111827" />
                  </Pressable>
                  <Text style={styles.counterValue}>{editForm.nbContrats}</Text>
                  <Pressable
                    style={[styles.counterButton, styles.counterButtonPrimary]}
                    onPress={() =>
                      setEditForm((prev) => ({
                        ...prev,
                        nbContrats: prev.nbContrats + 1,
                      }))
                    }
                  >
                    <Feather name="plus" size={16} color="#111827" />
                  </Pressable>
                </View>
              </View>
            )}

            <View
              style={[
                styles.sheetCard,
                styles.sheetCardComment,
                isTablet && styles.sheetCardTablet,
              ]}
            >
              <Text style={styles.sheetLabel}>Commentaire</Text>
              <TextInput
                placeholder="Ajouter un commentaire..."
                value={editForm.commentaire}
                onChangeText={(value) =>
                  setEditForm((prev) => ({ ...prev, commentaire: value }))
                }
                style={[styles.sheetInput, styles.sheetTextarea]}
                multiline
              />
            </View>

            <View
              style={[styles.sheetFooter, isTablet && styles.sheetFooterTablet]}
            >
              <Pressable style={styles.sheetGhost} onPress={closeEditSheet}>
                <Text style={styles.sheetGhostText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.sheetPrimary,
                  savingPorte && styles.sheetPrimaryDisabled,
                  isTablet && styles.sheetPrimaryTablet,
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  void saveEditSheet();
                }}
                disabled={savingPorte}
              >
                <Text style={styles.sheetPrimaryText}>
                  {savingPorte ? "..." : "Enregistrer"}
                </Text>
              </Pressable>
            </View>
          </>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <AddPorteSheet
        open={isAddPorteOpen}
        defaultEtage={addPorteDefaults.etage}
        defaultNumero={addPorteDefaults.numero}
        onClose={() => setIsAddPorteOpen(false)}
        onSubmit={handleAddPorte}
      />

      <ConfirmActionOverlay
        key={deleteTarget?.id ?? "delete-sheet"}
        open={!!deleteTarget}
        title="Supprimer cette porte ?"
        description={
          deleteTarget
            ? `Porte ${deleteTarget.nomPersonnalise || deleteTarget.numero}`
            : undefined
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={confirmDeletePorte}
        onClose={() => setDeleteTarget(null)}
      />

      {hasNativePicker && showDatePicker && DateTimePicker ? (
        <View style={styles.pickerWrapper}>
          <DateTimePicker
            value={getDateValue(editForm.rdvDate || getTodayDate())}
            mode="date"
            display="spinner"
            onChange={(_, selected: any) => {
              setShowDatePicker(false);
              if (selected) {
                const value = selected.toISOString().split("T")[0];
                setEditForm((prev) => ({ ...prev, rdvDate: value }));
              }
            }}
            style={isTablet ? styles.pickerScaleTablet : styles.pickerScale}
          />
        </View>
      ) : null}
      {hasNativePicker && showTimePicker && DateTimePicker ? (
        <View style={styles.pickerWrapper}>
          <DateTimePicker
            value={getTimeValue(editForm.rdvTime || getNowTime())}
            mode="time"
            display="spinner"
            onChange={(_, selected) => {
              setShowTimePicker(false);
              if (selected) {
                const hh = String(selected.getHours()).padStart(2, "0");
                const mm = String(selected.getMinutes()).padStart(2, "0");
                setEditForm((prev) => ({
                  ...prev,
                  rdvTime: `${hh}:${mm}`,
                }));
              }
            }}
            style={isTablet ? styles.pickerScaleTablet : styles.pickerScale}
          />
        </View>
      ) : null}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
  contentAnimated: {
    flex: 1,
  },
  skeletonWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  skeletonCard: {
    height: 84,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  skeletonCardTall: {
    height: 180,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
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
    borderColor: "#E2E8F0",
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
    color: "#64748B",
  },
  progressValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#2563EB",
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
    borderColor: "#E2E8F0",
    gap: 12,
  },
  currentBackdrop: {
    position: "absolute",
    right: -30,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
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
    color: "#64748B",
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
    borderColor: "#E2E8F0",
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
    backgroundColor: "#E2E8F0",
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
    color: "#0F172A",
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
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
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
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    gap: 8,
  },
  manageButtonDisabled: {
    opacity: 0.5,
  },
  manageIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  manageTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
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
    borderWidth: 1,
    borderColor: "transparent",
  },
  doorChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  doorChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
  },
  absentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  absentOptionMorning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  absentOptionEvening: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  absentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  absentOptionText: {
    flex: 1,
  },
  absentOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  absentOptionDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 14,
  },
  sheetContentTablet: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
  },
  sheetHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetHeroTablet: {
    padding: 16,
  },
  sheetHeroRdv: {
    backgroundColor: "#DBEAFE",
    borderColor: "#BFDBFE",
  },
  sheetHeroContract: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  sheetHeroIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  sheetHeroIconBlue: {
    backgroundColor: "#DBEAFE",
  },
  sheetHeroIconGreen: {
    backgroundColor: "#DCFCE7",
  },
  sheetHeroText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sheetTitleTablet: {
    fontSize: 18,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  sheetSubtitleTablet: {
    fontSize: 13,
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  sheetCardTablet: {
    padding: 16,
  },
  sheetCardRdv: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  sheetCardContract: {
    backgroundColor: "#ECFDF3",
    borderColor: "#BBF7D0",
  },
  sheetCardComment: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  inputInline: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  inputRowSpacing: {
    marginTop: 10,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerText: {
    flex: 1,
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  pickerValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  sheetHint: {
    fontSize: 11,
    color: "#64748B",
  },
  pickerWrapper: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: "center",
    minHeight: 240,
  },
  pickerScale: {
    transform: [{ scale: 1.15 }],
  },
  pickerScaleTablet: {
    transform: [{ scale: 1.45 }],
  },
  sheetLabelSpacing: {
    marginTop: 8,
  },
  sheetInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    color: "#111827",
  },
  sheetTextarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  counterButtonPrimary: {
    backgroundColor: "#D1FAE5",
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sheetFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  sheetFooterTablet: {
    marginTop: 10,
  },
  sheetGhost: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    alignItems: "center",
  },
  sheetGhostText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sheetPrimary: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    alignItems: "center",
  },
  sheetPrimaryTablet: {
    paddingVertical: 14,
  },
  sheetPrimaryDisabled: {
    opacity: 0.6,
  },
  sheetPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
