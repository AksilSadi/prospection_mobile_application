import AddPorteSheet, {
  type AddPortePayload,
} from "@/components/immeubles/AddPorteSheet";
import ConfirmActionOverlay from "@/components/immeubles/ConfirmActionOverlay";
import { useAddEtageToImmeuble } from "@/hooks/api/use-add-etage-to-immeuble";
import { useCreatePorte } from "@/hooks/api/use-create-porte";
import { useRemoveEtageFromImmeuble } from "@/hooks/api/use-remove-etage-from-immeuble";
import { useRemovePorteFromEtage } from "@/hooks/api/use-remove-porte-from-etage";
import { useUpdatePorte } from "@/hooks/api/use-update-porte";
import type {
  CreatePorteInput,
  Immeuble,
  Porte,
  UpdatePorteInput,
} from "@/types/api";
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
  Easing,
  FlatList,
  Keyboard,
  Modal,
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

const getLastDoorOnFloor = (portes: Porte[], etage: number) => {
  const floorDoors = portes.filter((porte) => porte.etage === etage);
  if (floorDoors.length === 0) return null;
  return floorDoors.reduce((last, porte) => {
    const cmp = String(porte.numero ?? "").localeCompare(
      String(last.numero ?? ""),
      "fr",
      { numeric: true, sensitivity: "base" },
    );
    return cmp > 0 ? porte : last;
  }, floorDoors[0]);
};

const getMaxEtage = (portes: Porte[], fallback: number) => {
  if (portes.length === 0) return fallback;
  return portes.reduce((max, porte) => Math.max(max, porte.etage), fallback);
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

type ImmeubleDetailsViewProps = {
  immeuble: Immeuble;
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onRefreshImmeuble?: () => void | Promise<void>;
};

export default function ImmeubleDetailsView({
  immeuble,
  onBack,
  onDirtyChange,
  onRefreshImmeuble,
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
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showFabHints, setShowFabHints] = useState(false);
  const immeubleIdRef = useRef<number | null>(null);
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
  const floorPlanScale = useRef(new Animated.Value(1)).current;
  const floorPlanPulse = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fabHintOpacity = useRef(new Animated.Value(0)).current;
  const progressFill = useRef(new Animated.Value(0)).current;
  const doorPagerRef = useRef<FlatList<Porte>>(null);
  const { add: addEtageToImmeuble, loading: addingEtage } =
    useAddEtageToImmeuble();
  const { create: createPorte, loading: creatingPorte } = useCreatePorte();
  const { update: updatePorte, loading: savingPorte } = useUpdatePorte();
  const { remove: removeEtageFromImmeuble, loading: removingEtage } =
    useRemoveEtageFromImmeuble();
  const { remove: removePorteFromEtage } = useRemovePorteFromEtage();
  const editSheetRef = useRef<BottomSheetModal>(null);
  const editSnapPoints = useMemo(
    () => (isTablet ? ["60%", "85%"] : ["55%", "75%"]),
    [isTablet],
  );
  const floorPlanSheetRef = useRef<BottomSheetModal>(null);
  const floorPlanSnapPoints = useMemo(
    () => (isTablet ? ["50%", "80%"] : ["45%", "70%"]),
    [isTablet],
  );
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const filterSnapPoints = useMemo(
    () => (isTablet ? ["45%", "70%"] : ["40%", "65%"]),
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
  const [deleteFloor, setDeleteFloor] = useState<number | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const nextPortes = immeuble.portes?.length
      ? immeuble.portes
      : buildFallbackPortes(immeuble);
    const isNewImmeuble = immeubleIdRef.current !== immeuble.id;
    immeubleIdRef.current = immeuble.id;
    setPortesState(nextPortes);
    setCurrentIndex((prev) => {
      if (isNewImmeuble) return 0;
      if (nextPortes.length === 0) return 0;
      return Math.min(prev, nextPortes.length - 1);
    });
    if (isNewImmeuble) {
      setHasLocalUpdates(false);
      if (onDirtyChange) onDirtyChange(false);
      setStatusFilters([]);
      setPendingStatusFilter(null);
      if (nextPortes.length > 0) {
        setIsReady(true);
        contentOpacity.setValue(1);
        contentTranslate.setValue(0);
      } else {
        setIsReady(false);
        contentOpacity.setValue(0);
        contentTranslate.setValue(12);
      }
    }
  }, [immeuble, onDirtyChange, contentOpacity, contentTranslate]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (fabHintTimeoutRef.current) {
        clearTimeout(fabHintTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isReady) return;
    const timeoutId = setTimeout(() => {
      setIsReady(true);
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 60);
    return () => clearTimeout(timeoutId);
  }, [contentOpacity, contentTranslate, isReady]);

  // Gérer l'ouverture de la bottom sheet du plan rapide
  useEffect(() => {
    if (showFloorPlan) {
      floorPlanSheetRef.current?.present();
    } else {
      floorPlanSheetRef.current?.close();
    }
  }, [showFloorPlan]);

  const triggerFloorPlan = () => {
    Animated.sequence([
      Animated.spring(floorPlanScale, {
        toValue: 0.92,
        useNativeDriver: true,
      }),
      Animated.spring(floorPlanScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(floorPlanPulse, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      floorPlanPulse.setValue(0);
      setShowFloorPlan(true);
    });
  };

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
    if (currentIndex < filteredPortes.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, filteredPortes.length - 1));
    }
  };

  const sortedPortes = useMemo(
    () => [...portesState].sort(comparePortesDesc),
    [portesState],
  );

  const filteredPortes = useMemo(() => {
    if (statusFilters.length === 0) return sortedPortes;
    return sortedPortes.filter(
      (porte) => getDisplayStatusKey(porte) === statusFilters[0],
    );
  }, [sortedPortes, statusFilters]);

  const displayNbEtages = useMemo(
    () => getMaxEtage(portesState, immeuble.nbEtages ?? 0),
    [portesState, immeuble.nbEtages],
  );
  const handleDoorScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / Math.max(1, width));
    setCurrentIndex((prev) =>
      Math.max(0, Math.min(nextIndex, filteredPortes.length - 1)),
    );
  };

  const currentPorte = filteredPortes[currentIndex];
  const currentStatus = getDisplayStatus(currentPorte) ?? {
    value: "NON_VISITE",
    label: "Non visite",
    description: "Par defaut",
    bg: "#E2E8F0",
    fg: "#475569",
    accent: "#CBD5F5",
    icon: "circle" as const,
  };

  useEffect(() => {
    if (currentIndex >= filteredPortes.length) {
      setCurrentIndex(Math.max(0, filteredPortes.length - 1));
    }
  }, [currentIndex, filteredPortes.length]);

  const progress = useMemo(() => {
    const total = sortedPortes.length;
    const visited = sortedPortes.filter(
      (porte) => porte.statut && porte.statut !== "NON_VISITE",
    ).length;
    const percentage = total ? Math.round((visited / total) * 100) : 0;
    return { total, visited, percentage };
  }, [sortedPortes]);

  useEffect(() => {
    Animated.timing(progressFill, {
      toValue: progress.percentage,
      duration: 820,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress.percentage, progressFill]);

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

  const floors = useMemo(() => {
    const unique = Array.from(new Set(sortedPortes.map((porte) => porte.etage)))
      .filter((etage) => typeof etage === "number")
      .sort((a, b) => b - a);
    return unique;
  }, [sortedPortes]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sortedPortes.forEach((porte) => {
      const key = getDisplayStatusKey(porte);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [sortedPortes]);

  const visibleStatusOptions = STATUS_OPTIONS;

  const togglePendingFilter = (value: string | null) => {
    setPendingStatusFilter((prev) => (prev === value ? null : value));
  };

  const applyStatusFilters = () => {
    setStatusFilters(pendingStatusFilter ? [pendingStatusFilter] : []);
    filterSheetRef.current?.dismiss();
  };

  const clearStatusFilters = () => {
    setStatusFilters([]);
    setPendingStatusFilter(null);
    filterSheetRef.current?.dismiss();
  };

  const jumpToFloor = (etage: number) => {
    const targetIndex = filteredPortes.findIndex(
      (porte) => porte.etage === etage,
    );

    if (targetIndex === -1) {
      showToast("Aucune porte", "Ce filtre ne contient pas cet etage");
      return;
    }
    setCurrentIndex(targetIndex);
    doorPagerRef.current?.scrollToIndex({ index: targetIndex, animated: true });
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
    const etage = (currentPorte?.etage ?? displayNbEtages) || 1;
    const numero = getNextDoorNumber(etage);
    setAddPorteDefaults({ etage, numero });
    setIsAddPorteOpen(true);
  };

  const handleAddPorte = async (payload: AddPortePayload) => {
    if (creatingPorte) return;
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
    const createPayload: CreatePorteInput = {
      immeubleId: immeuble.id,
      numero: payload.numero,
      nomPersonnalise: payload.nomPersonnalise || null,
      etage: payload.etage,
      statut: "NON_VISITE",
    };
    const created = await createPorte(createPayload);
    if (!created) {
      setPortesState((prev) => prev.filter((porte) => porte.id !== tempId));
      showToast("Erreur", "Ajout de porte impossible");
    } else {
      setPortesState((prev) =>
        prev.map((porte) => (porte.id === tempId ? created : porte)),
      );
    }
    setIsAddPorteOpen(false);
  };

  const handleAddEtage = async () => {
    if (addingEtage) return;
    const nextEtage = Math.max(1, displayNbEtages + 1);
    const tempIdBase = -Date.now();
    const tempDoors: Porte[] = Array.from(
      { length: immeuble.nbPortesParEtage || 0 },
      (_, index) => ({
        id: tempIdBase - index - 1,
        numero: String(index + 1),
        etage: nextEtage,
        immeubleId: immeuble.id,
        statut: "NON_VISITE",
      }),
    );
    const tempIds = tempDoors.map((porte) => porte.id);
    setPortesState((prev) => [...prev, ...tempDoors]);
    setHasLocalUpdates(true);
    if (onDirtyChange) onDirtyChange(true);
    showToast("Etage ajoute", `Etage ${nextEtage}`);
    const added = await addEtageToImmeuble(immeuble.id);
    if (!added) {
      setPortesState((prev) =>
        prev.filter((porte) => !tempIds.includes(porte.id)),
      );
      showToast("Erreur", "Ajout etage impossible");
      return;
    }

    if (onRefreshImmeuble) {
      void onRefreshImmeuble();
    }
  };

  const openDeletePorte = () => {
    if (!currentPorte) {
      showToast("Aucune porte", "Impossible de supprimer");
      return;
    }
    const lastDoor = getLastDoorOnFloor(portesState, currentPorte.etage);
    if (!lastDoor) {
      showToast("Aucune porte", "Impossible de supprimer");
      return;
    }
    if (lastDoor.id !== currentPorte.id) {
      showToast(
        "Information",
        "Seule la derniere porte de l'etage est supprimee",
      );
    }
    setDeleteFloor(null);
    setDeleteTarget(lastDoor);
  };

  const confirmDeletePorte = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetFloor = deleteTarget.etage;
    const previous = portesState;
    const removedIndex = sortedPortes.findIndex(
      (porte) => porte.id === targetId,
    );
    const nextPortes = previous.filter((porte) => porte.id !== targetId);
    setPortesState(nextPortes);
    setHasLocalUpdates(true);
    if (onDirtyChange) onDirtyChange(true);
    setCurrentIndex((prev) => {
      const nextLength = Math.max(0, sortedPortes.length - 1);
      if (nextLength === 0) return 0;
      const base = removedIndex >= 0 && removedIndex < prev ? prev - 1 : prev;
      return Math.max(0, Math.min(base, nextLength - 1));
    });
    showToast(
      "Porte supprimee",
      deleteTarget.nomPersonnalise
        ? deleteTarget.nomPersonnalise
        : `Porte ${deleteTarget.numero}`,
    );
    setDeleteTarget(null);
    if (targetId < 0) return;
    const removed = await removePorteFromEtage(immeuble.id, targetFloor);
    if (!removed) {
      setPortesState(previous);
      showToast("Erreur", "Suppression impossible");
    }
  };

  const openDeleteEtage = () => {
    if (removingEtage) return;
    const lastFloor = getMaxEtage(portesState, immeuble.nbEtages ?? 0);
    if (!lastFloor) {
      showToast("Aucun etage", "Impossible de supprimer");
      return;
    }
    setDeleteTarget(null);
    setDeleteFloor(lastFloor);
  };

  const confirmDeleteEtage = async () => {
    if (deleteFloor === null) return;
    const targetFloor = deleteFloor;
    const previous = portesState;
    const nextPortes = previous.filter((porte) => porte.etage !== targetFloor);
    setPortesState(nextPortes);
    setHasLocalUpdates(true);
    if (onDirtyChange) onDirtyChange(true);
    setCurrentIndex((prev) =>
      Math.max(0, Math.min(prev, Math.max(0, nextPortes.length - 1))),
    );
    showToast("Etage supprime", `Etage ${targetFloor}`);
    setDeleteFloor(null);
    const removed = await removeEtageFromImmeuble(immeuble.id);
    if (!removed) {
      setPortesState(previous);
      showToast("Erreur", "Suppression impossible");
    }
  };

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
  };

  const fabRotation = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const toggleFab = () => {
    setIsFabOpen((prev) => {
      const next = !prev;
      Animated.timing(fabAnim, {
        toValue: next ? 1 : 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      if (next) {
        triggerFabHints();
      }
      return next;
    });
  };

  const closeFab = () => {
    Animated.timing(fabAnim, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setIsFabOpen(false));
    fabHintOpacity.stopAnimation();
    fabHintOpacity.setValue(0);
    setShowFabHints(false);
  };

  const handleFabAction = (action: () => void) => {
    closeFab();
    action();
  };

  const triggerFabHints = () => {
    if (fabHintTimeoutRef.current) {
      clearTimeout(fabHintTimeoutRef.current);
    }
    setShowFabHints(true);
    fabHintOpacity.stopAnimation();
    fabHintOpacity.setValue(0);
    Animated.timing(fabHintOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    fabHintTimeoutRef.current = setTimeout(() => {
      Animated.timing(fabHintOpacity, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => {
        setShowFabHints(false);
      });
    }, 1400);
  };

  const advanceToNextDoor = (porteId: number, portes: Porte[]) => {
    const targetIndex = portes.findIndex((item) => item.id === porteId);
    if (targetIndex >= 0 && targetIndex < portes.length - 1) {
      setTimeout(() => {
        const nextIndex = targetIndex + 1;
        setCurrentIndex(nextIndex);
        doorPagerRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      }, 120);
    }
  };

  const handleStatusSelect = async (statut: string, target?: Porte) => {
    const porte = target ?? currentPorte;
    if (!porte) return;
    if (statut === "RENDEZ_VOUS_PRIS" || statut === "CONTRAT_SIGNE") {
      openEditSheet(porte, statut);
      return;
    }
    if (statut === "ABSENT_MATIN") {
      void applyStatus(porte, "ABSENT", { nbRepassages: 1 });
      advanceToNextDoor(porte.id, filteredPortes);
      return;
    }
    if (statut === "ABSENT_SOIR") {
      const nextRepassage = Math.max(2, porte.nbRepassages ?? 0);
      void applyStatus(porte, "ABSENT", {
        nbRepassages: nextRepassage,
      });
      advanceToNextDoor(porte.id, filteredPortes);
      return;
    }
    void applyStatus(porte, statut);
    advanceToNextDoor(porte.id, filteredPortes);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          android_ripple={{ color: "transparent", borderless: true }}
          onPress={() => setShowExitConfirm(true)}
        >
          <Feather name="arrow-left" size={18} color="#2563EB" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {immeuble.adresse}
          </Text>
          <Text style={styles.headerSubtitle}>
            {displayNbEtages} etages - {immeuble.nbPortesParEtage} portes/etage
          </Text>
        </View>
        <Pressable style={styles.floorPlanButton} onPress={triggerFloorPlan}>
          <Animated.View
            style={[
              styles.floorPlanPulse,
              {
                opacity: floorPlanPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.35],
                }),
                transform: [
                  {
                    scale: floorPlanPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1.6],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View style={{ transform: [{ scale: floorPlanScale }] }}>
            <Feather name="grid" size={18} color="#FFFFFF" />
          </Animated.View>
        </Pressable>
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
      ) : (
        <>
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
              {/* Progress bar moderne style iOS */}
              <View
                style={[
                  styles.progressCardNew,
                  isTablet && styles.progressCardNewTablet,
                ]}
              >
                <View style={styles.progressRowNew}>
                  <View style={styles.progressLeftNew}>
                    <View style={styles.progressIconNew}>
                      <Feather name="activity" size={14} color="#2563EB" />
                    </View>
                    <View style={styles.progressTextsNew}>
                      <Text style={styles.progressTitleNew}>Progression</Text>
                      <Text style={styles.progressSubtitleNew}>
                        {progress.visited} / {progress.total} portes
                      </Text>
                    </View>
                  </View>
                  <View style={styles.progressPercentNew}>
                    <Text style={styles.progressPercentTextNew}>
                      {progress.percentage}%
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBarTrackNew}>
                  <Animated.View
                    style={[
                      styles.progressBarFillNew,
                      {
                        width: progressFill.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.statusHeaderRow}>
                <View style={styles.statusHeaderLeft}>
                  <Text style={styles.statusHeaderTitle}>Statuts</Text>
                  {statusFilters.length > 0 ? (
                    <Text style={styles.statusHeaderSubtitle}>
                      1 filtre actif
                    </Text>
                  ) : (
                    <Text style={styles.statusHeaderSubtitle}>
                      Tous les statuts
                    </Text>
                  )}
                </View>
                <Pressable
                  style={styles.statusFilterButton}
                  onPress={() => {
                    setPendingStatusFilter(statusFilters[0] ?? null);
                    filterSheetRef.current?.present();
                  }}
                >
                  <Feather name="filter" size={15} color="#FFFFFF" />
                  <Text style={styles.statusFilterText}>Filtrer</Text>
                </Pressable>
              </View>

              <View style={styles.floorTabsWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.floorTabsScroll}
                  contentContainerStyle={styles.floorTabs}
                >
                  {floors.map((etage) => {
                    const isActive = currentPorte?.etage === etage;
                    return (
                      <Pressable
                        key={`floor-${etage}`}
                        style={[
                          styles.floorTab,
                          isActive && styles.floorTabActive,
                        ]}
                        onPress={() => jumpToFloor(etage)}
                      >
                        <Text
                          style={[
                            styles.floorTabText,
                            isActive && styles.floorTabTextActive,
                          ]}
                        >
                          Etage {etage}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Carte de porte avec statuts (swipe horizontal) */}
              <FlatList
                ref={doorPagerRef}
                data={filteredPortes}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                onMomentumScrollEnd={handleDoorScrollEnd}
                style={styles.doorPager}
                getItemLayout={(_, index) => ({
                  length: width,
                  offset: width * index,
                  index,
                })}
                contentContainerStyle={styles.doorPagerContent}
                ListEmptyComponent={
                  <View style={styles.emptyFilterCard}>
                    <Feather name="filter" size={20} color="#94A3B8" />
                    <Text style={styles.emptyFilterTitle}>
                      Aucune porte trouvee
                    </Text>
                    <Text style={styles.emptyFilterText}>
                      Aucun resultat avec ce filtre.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const status = getDisplayStatus(item) ?? {
                    value: "NON_VISITE",
                    label: "Non visite",
                    description: "Par defaut",
                    bg: "#E2E8F0",
                    fg: "#475569",
                    accent: "#CBD5F5",
                    icon: "circle" as const,
                  };
                  return (
                    <View style={[styles.doorPagerItem, { width }]}>
                      <View style={styles.doorCardInScroll}>
                        <View style={styles.doorCardHeader}>
                          <View style={styles.doorCardTitleRow}>
                            <View style={styles.doorNumberBadge}>
                              <Text style={styles.doorNumberText}>
                                {item.nomPersonnalise || item.numero || "--"}
                              </Text>
                            </View>
                            <View style={styles.doorFloorBadge}>
                              <Feather
                                name="layers"
                                size={12}
                                color="#64748B"
                              />
                              <Text style={styles.doorFloorText}>
                                Etage {item.etage ?? "--"}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: status.bg },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDotBadge,
                                { backgroundColor: status.accent },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: status.fg },
                              ]}
                            >
                              {status.label}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.statusGrid}>
                          {visibleStatusOptions.map((option) => {
                            const isActiveStatus =
                              getDisplayStatusKey(item) === option.value;
                            const cardBg = isActiveStatus
                              ? option.accent
                              : option.bg;
                            const cardBorder = isActiveStatus
                              ? option.accent
                              : "#E2E8F0";
                            const labelColor = isActiveStatus
                              ? "#FFFFFF"
                              : option.fg;
                            const descColor = isActiveStatus
                              ? "rgba(255, 255, 255, 0.9)"
                              : option.fg;
                            const iconBg = isActiveStatus
                              ? "rgba(255, 255, 255, 0.2)"
                              : option.accent;
                            const iconColor = isActiveStatus
                              ? "#FFFFFF"
                              : option.fg;
                            return (
                              <View
                                key={option.value}
                                style={styles.statusCardWrap}
                              >
                                <Pressable
                                  style={[
                                    styles.statusCard,
                                    {
                                      backgroundColor: cardBg,
                                      borderColor: cardBorder,
                                    },
                                  ]}
                                  onPress={() =>
                                    handleStatusSelect(option.value, item)
                                  }
                                >
                                  <View
                                    style={[
                                      styles.statusIcon,
                                      { backgroundColor: iconBg },
                                    ]}
                                  >
                                    <Feather
                                      name={option.icon}
                                      size={16}
                                      color={iconColor}
                                    />
                                  </View>
                                  <Text
                                    style={[
                                      styles.statusLabel,
                                      { color: labelColor },
                                    ]}
                                  >
                                    {option.label}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.statusDesc,
                                      { color: descColor },
                                    ]}
                                  >
                                    {option.description}
                                  </Text>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            </ScrollView>
          </Animated.View>
        </>
      )}

      <BottomSheetModal
        ref={editSheetRef}
        index={1}
        snapPoints={editSnapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...(props ?? {})}
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
                <View style={styles.sheetSectionHeader}>
                  <View
                    style={[
                      styles.sheetSectionIcon,
                      styles.sheetSectionIconBlue,
                    ]}
                  >
                    <Feather name="calendar" size={14} color="#1D4ED8" />
                  </View>
                  <View style={styles.sheetSectionText}>
                    <Text style={styles.sheetSectionTitle}>Quand</Text>
                    <Text style={styles.sheetSectionSubtitle}>
                      Date et heure du rendez-vous
                    </Text>
                  </View>
                </View>
                {hasNativePicker ? (
                  <>
                    <Pressable
                      style={[styles.pickerRow, styles.pickerRowPrimary]}
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
                      style={[styles.pickerRow, styles.pickerRowPrimary]}
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
                <View style={styles.sheetSectionHeader}>
                  <View
                    style={[
                      styles.sheetSectionIcon,
                      styles.sheetSectionIconGreen,
                    ]}
                  >
                    <Feather name="award" size={14} color="#047857" />
                  </View>
                  <View style={styles.sheetSectionText}>
                    <Text style={styles.sheetSectionTitle}>
                      Contrats signes
                    </Text>
                    <Text style={styles.sheetSectionSubtitle}>
                      Nombre total confirme
                    </Text>
                  </View>
                </View>
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
                  <View style={styles.counterValueWrap}>
                    <Text style={styles.counterValue}>
                      {editForm.nbContrats}
                    </Text>
                    <Text style={styles.counterLabel}>contrats</Text>
                  </View>
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
              <View style={styles.sheetSectionHeader}>
                <View style={styles.sheetSectionIcon}>
                  <Feather name="message-square" size={14} color="#2563EB" />
                </View>
                <View style={styles.sheetSectionText}>
                  <Text style={styles.sheetSectionTitle}>Commentaire</Text>
                  <Text style={styles.sheetSectionSubtitle}>
                    Notes rapides pour cette porte
                  </Text>
                </View>
              </View>
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

      {/* Bottom Sheet Plan Rapide */}
      <BottomSheetModal
        ref={floorPlanSheetRef}
        index={showFloorPlan ? 1 : -1}
        snapPoints={floorPlanSnapPoints}
        enablePanDownToClose
        onChange={(index) => {
          if (index === -1) setShowFloorPlan(false);
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...(props ?? {})}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.4}
          />
        )}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            isTablet && styles.sheetContentTablet,
          ]}
        >
          <View style={styles.floorPlanHero}>
            <View style={styles.floorPlanHeroIcon}>
              <Feather name="grid" size={22} color="#2563EB" />
            </View>
            <View style={styles.floorPlanHeroText}>
              <Text style={styles.floorPlanTitle}>Plan de l'immeuble</Text>
              <Text style={styles.floorPlanSubtitle}>
                {sortedPortes.length} portes • {portesParEtage.length} etages
              </Text>
            </View>
          </View>

          <View style={styles.floorPlanCurrent}>
            <Text style={styles.floorPlanCurrentLabel}>Porte actuelle</Text>
            <View style={styles.floorPlanCurrentCard}>
              <View style={styles.floorPlanCurrentBadge}>
                <Text style={styles.floorPlanCurrentNumber}>
                  {currentPorte?.nomPersonnalise ||
                    currentPorte?.numero ||
                    "--"}
                </Text>
              </View>
              <View style={styles.floorPlanCurrentInfo}>
                <Text style={styles.floorPlanCurrentFloor}>
                  Étage {currentPorte?.etage ?? "--"}
                </Text>
                {currentStatus && (
                  <Text
                    style={[
                      styles.floorPlanCurrentStatus,
                      { color: currentStatus.accent },
                    ]}
                  >
                    {currentStatus.label}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.floorPlanList}>
            <Text style={styles.floorPlanListTitle}>Toutes les portes</Text>
            {portesParEtage.map(([etage, portes]) => (
              <View key={etage} style={styles.floorPlanEtageSection}>
                <Text style={styles.floorPlanEtageLabel}>Étage {etage}</Text>
                <View style={styles.floorPlanDoorsGrid}>
                  {portes.map((porte) => {
                    const status = getDisplayStatus(porte);
                    const isActive = porte.id === currentPorte?.id;
                    const isVisited = status !== null;
                    const chipBg = isVisited ? status?.accent : "#F1F5F9";
                    const chipBorder = isActive
                      ? status?.accent
                      : "transparent";
                    const chipText = isVisited ? "#FFFFFF" : "#64748B";

                    return (
                      <View
                        key={porte.id}
                        style={[
                          styles.floorPlanDoorChip,
                          {
                            backgroundColor: chipBg,
                            borderColor: chipBorder,
                            borderWidth: isActive ? 2 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.floorPlanDoorChipText,
                            { color: chipText },
                          ]}
                        >
                          {porte.nomPersonnalise || porte.numero}
                        </Text>
                        {isActive && (
                          <View style={styles.floorPlanActiveIndicator} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={filterSheetRef}
        snapPoints={filterSnapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...(props ?? {})}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.5}
          />
        )}
        onChange={(index) => {
          if (index === -1) {
            setPendingStatusFilter(statusFilters[0] ?? null);
          }
        }}
        backgroundStyle={styles.filterSheetBackground}
        handleIndicatorStyle={styles.filterHandleIndicator}
        animateOnMount
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            isTablet && styles.sheetContentTablet,
          ]}
        >
          {/* Header avec bordure */}
          <View style={styles.filterSheetHeader}>
            <Pressable
              style={styles.filterCloseBtn}
              onPress={() => filterSheetRef.current?.dismiss()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="x" size={20} color="#212121" />
            </Pressable>
            <Text style={styles.filterHeaderTitle}>Filtres</Text>
            <Pressable
              style={styles.filterResetBtn}
              onPress={clearStatusFilters}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.filterResetLabel}>Reset</Text>
            </Pressable>
          </View>

          {/* Section Statuts avec radio buttons */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>Filtrer par statut</Text>
            <View style={styles.filterRadioGroup}>
              {/* Option "Toutes les portes" */}
              <Pressable
                style={[
                  styles.filterRadioItem,
                  pendingStatusFilter === null && styles.filterRadioItemActive,
                ]}
                onPress={() => togglePendingFilter(null)}
              >
                <View style={styles.filterRadioContent}>
                  <View
                    style={[
                      styles.filterRadioCircle,
                      pendingStatusFilter === null &&
                        styles.filterRadioCircleActive,
                    ]}
                  >
                    {pendingStatusFilter === null && (
                      <View style={styles.filterRadioDot} />
                    )}
                  </View>
                  <View style={styles.filterRadioTextContainer}>
                    <Text
                      style={[
                        styles.filterRadioLabel,
                        pendingStatusFilter === null &&
                          styles.filterRadioLabelActive,
                      ]}
                    >
                      Toutes les portes
                    </Text>
                    <Text style={styles.filterRadioDescription}>
                      Afficher tous les statuts
                    </Text>
                  </View>
                </View>
                <View style={styles.filterRadioBadge}>
                  <Text style={styles.filterRadioBadgeText}>
                    {sortedPortes.length}
                  </Text>
                </View>
              </Pressable>

              {/* Options de statut */}
              {STATUS_OPTIONS.map((option) => {
                const isSelected = pendingStatusFilter === option.value;
                const count = statusCounts[option.value] ?? 0;
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.filterRadioItem,
                      isSelected && styles.filterRadioItemActive,
                      count === 0 && styles.filterRadioItemDisabled,
                    ]}
                    onPress={() =>
                      count > 0 && togglePendingFilter(option.value)
                    }
                    disabled={count === 0}
                  >
                    <View style={styles.filterRadioContent}>
                      <View
                        style={[
                          styles.filterRadioCircle,
                          styles.filterRadioCircleWithColor,
                          isSelected && styles.filterRadioCircleActive,
                          { borderColor: option.accent },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[
                              styles.filterRadioDot,
                              { backgroundColor: option.accent },
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.filterRadioTextContainer}>
                        <Text
                          style={[
                            styles.filterRadioLabel,
                            isSelected && styles.filterRadioLabelActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.filterRadioDescription,
                            count === 0 &&
                              styles.filterRadioDescriptionDisabled,
                          ]}
                        >
                          {option.description}
                          {count === 0 && " (Aucune porte)"}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.filterRadioBadge,
                        styles.filterRadioBadgeWithColor,
                        { backgroundColor: option.bg + "40" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterRadioBadgeText,
                          { color: option.fg },
                          isSelected && { color: option.accent },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Footer avec bouton Apply */}
          <View style={styles.filterSheetFooter}>
            <Pressable
              style={styles.filterApplyButton}
              onPress={applyStatusFilters}
            >
              <Text style={styles.filterApplyButtonText}>
                Appliquer{" "}
                {pendingStatusFilter
                  ? `(${statusCounts[pendingStatusFilter] ?? 0})`
                  : `(${sortedPortes.length})`}
              </Text>
            </Pressable>
          </View>
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
        key={
          deleteFloor !== null
            ? `delete-floor-${deleteFloor}`
            : (deleteTarget?.id ?? "delete-sheet")
        }
        open={!!deleteTarget || deleteFloor !== null}
        title={
          deleteFloor !== null
            ? "Supprimer le dernier etage ?"
            : "Supprimer la derniere porte ?"
        }
        description={
          deleteFloor !== null
            ? `Etage ${deleteFloor} (toutes les portes seront supprimees)`
            : deleteTarget
              ? `Etage ${deleteTarget.etage} - Porte ${
                  deleteTarget.nomPersonnalise || deleteTarget.numero
                }`
              : undefined
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="danger"
        onConfirm={() => {
          if (deleteFloor !== null) {
            void confirmDeleteEtage();
            return;
          }
          void confirmDeletePorte();
        }}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteFloor(null);
        }}
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

      <View
        style={[
          styles.fabMenu,
          { bottom: insets.bottom + (isTablet ? 28 : 24) },
        ]}
        pointerEvents={isFabOpen ? "auto" : "box-none"}
      >
        <View
          style={[
            styles.fabChips,
            { width: isTablet ? 260 : 220, height: isTablet ? 260 : 220 },
          ]}
          pointerEvents="box-none"
        >
          {[
            {
              label: "Ajouter porte",
              subLabel: "Etage courant",
              icon: "plus",
              tone: "primary",
              onPress: openAddPorte,
            },
            {
              label: "Ajouter etage",
              subLabel: "Nouveau niveau",
              icon: "layers",
              tone: "primary",
              onPress: handleAddEtage,
            },
            {
              label: "Supprimer porte",
              subLabel: "Derniere de l'etage",
              icon: "trash-2",
              tone: "danger",
              onPress: openDeletePorte,
            },
            {
              label: "Supprimer etage",
              subLabel: "Dernier etage",
              icon: "minus-circle",
              tone: "danger",
              onPress: openDeleteEtage,
            },
          ].map((action, index, items) => {
            const arcStart = -100;
            const arcEnd = -180;
            const angle =
              items.length > 1
                ? arcStart + ((arcEnd - arcStart) * index) / (items.length - 1)
                : -135;
            const radius = isTablet ? 160 : 130;
            const chipSize = isTablet ? 64 : 56;
            const angleRad = (Math.PI / 180) * angle;
            const dirX = Math.cos(angleRad);
            const dirY = Math.sin(angleRad);
            const hintDistance = chipSize * 1.05;
            const targetX = Math.cos((Math.PI / 180) * angle) * radius;
            const targetY = Math.sin((Math.PI / 180) * angle) * radius;
            const translateX = fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, targetX],
            });
            const translateY = fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, targetY],
            });
            const hintTranslateX = Animated.add(
              translateX,
              new Animated.Value(dirX * hintDistance),
            );
            const hintTranslateY = Animated.add(
              translateY,
              new Animated.Value(dirY * hintDistance),
            );
            const scale = fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            });
            const opacity = fabAnim.interpolate({
              inputRange: [0, 0.3, 1],
              outputRange: [0, 0.3, 1],
            });
            const isDanger = action.tone === "danger";
            return (
              <View
                key={action.label}
                style={styles.fabChipAnchor}
                pointerEvents="box-none"
              >
                <Animated.View
                  style={[
                    styles.fabChipWrap,
                    {
                      width: chipSize,
                      height: chipSize,
                      transform: [{ translateX }, { translateY }, { scale }],
                      opacity,
                    },
                  ]}
                >
                  <Pressable
                    accessibilityLabel={action.label}
                    accessibilityHint={action.subLabel}
                    style={[
                      styles.fabChip,
                      isDanger ? styles.fabChipDanger : styles.fabChipPrimary,
                      {
                        width: chipSize,
                        height: chipSize,
                        borderRadius: chipSize / 2,
                      },
                    ]}
                    onPress={() => handleFabAction(action.onPress)}
                  >
                    <Feather
                      name={action.icon as keyof typeof Feather.glyphMap}
                      size={isTablet ? 22 : 20}
                      color={isDanger ? "#B91C1C" : "#1D4ED8"}
                    />
                  </Pressable>
                </Animated.View>
                {showFabHints ? (
                  <Animated.View
                    style={[
                      styles.fabHintWrap,
                      {
                        transform: [
                          { translateX: hintTranslateX },
                          { translateY: hintTranslateY },
                        ],
                        opacity: Animated.multiply(opacity, fabHintOpacity),
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <View
                      style={[styles.fabHint, isDanger && styles.fabHintDanger]}
                    >
                      <Text
                        style={[
                          styles.fabHintText,
                          isDanger && styles.fabHintTextDanger,
                        ]}
                      >
                        {action.label}
                      </Text>
                    </View>
                  </Animated.View>
                ) : null}
              </View>
            );
          })}
        </View>
        <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
          <Pressable style={styles.fabButton} onPress={toggleFab}>
            <Feather name="menu" size={22} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={showExitConfirm}
        onRequestClose={() => setShowExitConfirm(false)}
      >
        <View style={styles.exitOverlay}>
          <View style={styles.exitCard}>
            <View style={styles.exitIconWrap}>
              <Feather name="alert-triangle" size={20} color="#EF4444" />
            </View>
            <Text style={styles.exitTitle}>Quitter la fiche ?</Text>
            <Text style={styles.exitText}>
              Tu vas revenir à la liste des immeubles. Continuer ?
            </Text>
            <View style={styles.exitActions}>
              <Pressable
                style={styles.exitButtonSecondary}
                onPress={() => setShowExitConfirm(false)}
              >
                <Text style={styles.exitButtonSecondaryText}>Non, rester</Text>
              </Pressable>
              <Pressable
                style={styles.exitButtonPrimary}
                onPress={() => {
                  setShowExitConfirm(false);
                  onBack();
                }}
              >
                <Text style={styles.exitButtonPrimaryText}>Oui, quitter</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingLeft: 12,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonPressed: {
    backgroundColor: "#EFF6FF",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  floorPlanButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "visible",
  },
  floorPlanPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    gap: 12,
  },
  progressCardTablet: {
    padding: 22,
    borderRadius: 24,
  },
  // Nouveau style de barre de progression moderne
  progressCardNew: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 12,
  },
  progressCardNewTablet: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
  },
  progressRowNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLeftNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  progressIconNew: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  progressTextsNew: {
    flex: 1,
  },
  progressTitleNew: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  progressSubtitleNew: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  progressPercentNew: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  progressPercentTextNew: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  progressBarTrackNew: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressBarFillNew: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressTitleTablet: {
    fontSize: 16,
  },
  progressSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
  },
  progressSubtitleTablet: {
    fontSize: 13,
  },
  progressPercentPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  progressPercentTextTablet: {
    fontSize: 14,
  },
  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressBarTablet: {
    height: 14,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563EB",
  },
  progressStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressStat: {
    flex: 1,
  },
  progressStatValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  progressStatValueTablet: {
    fontSize: 22,
  },
  progressStatLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
  },
  progressStatLabelTablet: {
    fontSize: 13,
  },
  progressDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },
  doorPagerWrap: {
    paddingVertical: 12,
  },
  doorPagerContent: {},
  doorPage: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  // Indicateur de swipe
  swipeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 8,
  },
  swipeDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swipeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
  },
  swipeDotActive: {
    backgroundColor: "#2563EB",
  },
  swipeHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 8,
  },
  currentCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
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
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCounter: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: "#94A3B8",
  },
  statusCard: {
    width: "100%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F2F2F7",
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    gap: 6,
  },
  statusCardWrap: {
    width: "48%",
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
  manageSheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  manageSheetHero: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  manageSheetHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  manageSheetTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  manageSheetSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
  },
  manageSheetGroup: {
    gap: 10,
  },
  manageSheetGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  manageSheetDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  manageSheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  manageSheetActionDisabled: {
    opacity: 0.5,
  },
  manageSheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  manageSheetIconDanger: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  manageSheetText: {
    flex: 1,
  },
  manageSheetLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  manageSheetHint: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
  },
  // Styles tablette pour le manageSheet
  manageSheetTablet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  manageSheetHeroTablet: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  manageSheetHeroIconTablet: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  manageSheetTitleTablet: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  manageSheetSubtitleTablet: {
    fontSize: 13,
    color: "#64748B",
  },
  manageGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  manageCardTablet: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  manageCardTabletDisabled: {
    opacity: 0.45,
  },
  manageCardIconBlue: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  manageCardIconRed: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  manageCardIconPurple: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  manageCardIconOrange: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F97316",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  manageCardLabelTablet: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  manageCardDescTablet: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  mapCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
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
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
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
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sheetHeroTablet: {
    padding: 18,
  },
  sheetHeroRdv: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5F5",
  },
  sheetHeroContract: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CDEBDD",
  },
  sheetHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  sheetHeroIconBlue: {
    backgroundColor: "#E8EDFF",
  },
  sheetHeroIconGreen: {
    backgroundColor: "#E6F4ED",
  },
  sheetHeroText: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
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
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sheetCardTablet: {
    padding: 18,
  },
  sheetCardRdv: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5F5",
  },
  sheetCardContract: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CDEBDD",
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
    borderRadius: 14,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  pickerRowPrimary: {
    borderColor: "#CBD5F5",
    backgroundColor: "#FFFFFF",
  },
  pickerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
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
    fontWeight: "700",
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
    borderRadius: 14,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  counterButtonPrimary: {
    backgroundColor: "#E6F4ED",
  },
  counterValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  counterValueWrap: {
    alignItems: "center",
    gap: 2,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  sheetSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sheetSectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSectionIconBlue: {
    backgroundColor: "#E8EDFF",
  },
  sheetSectionIconGreen: {
    backgroundColor: "#E6F4ED",
  },
  sheetSectionText: {
    flex: 1,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSectionSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
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
  // ============================================
  // FILTER BOTTOM SHEET STYLES (Redesign)
  // ============================================
  filterSheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  filterHandleIndicator: {
    backgroundColor: "#E2E8F0",
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  filterHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
    letterSpacing: -0.3,
  },
  filterResetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  filterResetLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  filterSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  filterSectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  filterRadioGroup: {
    gap: 4,
  },
  filterRadioItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterRadioItemActive: {
    backgroundColor: "#F0F7FF",
    borderColor: "#2563EB",
  },
  filterRadioItemDisabled: {
    opacity: 0.5,
  },
  filterRadioContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  filterRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterRadioCircleWithColor: {
    borderColor: "#E0E0E0",
  },
  filterRadioCircleActive: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  filterRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
  },
  filterRadioTextContainer: {
    flex: 1,
  },
  filterRadioLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#212121",
    marginBottom: 2,
  },
  filterRadioLabelActive: {
    fontWeight: "600",
    color: "#2563EB",
  },
  filterRadioDescription: {
    fontSize: 12,
    color: "#757575",
    fontStyle: "italic",
  },
  filterRadioDescriptionDisabled: {
    color: "#9E9E9E",
  },
  filterRadioBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ECEFF1",
    minWidth: 28,
    alignItems: "center",
  },
  filterRadioBadgeWithColor: {},
  filterRadioBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#616161",
  },
  filterSheetFooter: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  filterApplyButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  filterApplyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  doorCardInScroll: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: 12,
    marginBottom: 16,
  },
  doorPager: {
    marginHorizontal: -16,
  },
  doorPagerContent: {
    paddingVertical: 4,
  },
  doorPagerItem: {
    paddingHorizontal: 16,
  },
  doorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  doorCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  doorNumberBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  doorNumberText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  doorFloorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  doorFloorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  statusDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  floorTabsWrap: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    padding: 6,
    marginTop: 10,
    marginBottom: 10,
    alignSelf: "center",
    flexGrow: 0,
    flexShrink: 0,
  },
  floorTabsScroll: {
    alignSelf: "center",
    flexGrow: 0,
  },
  floorTabs: {
    gap: 8,
    paddingHorizontal: 4,
  },
  floorTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  floorTabActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  floorTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  floorTabTextActive: {
    color: "#FFFFFF",
  },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },
  statusHeaderLeft: {
    flex: 1,
  },
  statusHeaderTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusHeaderSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#94A3B8",
  },
  statusFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emptyFilterCard: {
    width: "100%",
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 6,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyFilterText: {
    fontSize: 12,
    color: "#64748B",
  },
  emptyFilterActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    alignSelf: "stretch",
  },
  // Styles pour le plan rapide en bottom sheet
  floorPlanHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    marginBottom: 16,
  },
  floorPlanHeroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  floorPlanHeroText: {
    flex: 1,
  },
  floorPlanTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  floorPlanSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
  },
  floorPlanCurrent: {
    marginBottom: 20,
  },
  floorPlanCurrentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  floorPlanCurrentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  floorPlanCurrentBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  floorPlanCurrentNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  floorPlanCurrentInfo: {
    flex: 1,
  },
  floorPlanCurrentFloor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  floorPlanCurrentStatus: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
  },
  floorPlanList: {
    gap: 16,
  },
  floorPlanListTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  floorPlanEtageSection: {
    gap: 10,
  },
  floorPlanEtageLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  floorPlanDoorsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  floorPlanDoorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "transparent",
    minWidth: 50,
    alignItems: "center",
  },
  floorPlanDoorChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  floorPlanActiveIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  exitOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  exitCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  exitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  exitTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  exitText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    color: "#64748B",
  },
  exitActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  exitButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },
  exitButtonSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  exitButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  exitButtonPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fabMenu: {
    position: "absolute",
    right: 18,
    alignItems: "flex-end",
    zIndex: 20,
  },
  fabChips: {
    position: "absolute",
    right: 0,
    bottom: 0,
    alignItems: "flex-end",
    overflow: "visible",
  },
  fabChipAnchor: {
    position: "absolute",
    right: 0,
    bottom: 0,
    overflow: "visible",
  },
  fabChipWrap: {
    position: "absolute",
    right: 0,
    bottom: 0,
    alignItems: "center",
    overflow: "visible",
  },
  fabChip: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabChipPrimary: {
    borderColor: "#DBEAFE",
    backgroundColor: "#FFFFFF",
  },
  fabChipDanger: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FFF1F2",
  },
  fabHint: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    alignSelf: "flex-start",
  },
  fabHintWrap: {
    position: "absolute",
    right: 0,
    bottom: 0,
    overflow: "visible",
    alignItems: "flex-start",
    zIndex: 25,
  },
  fabHintDanger: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECACA",
  },
  fabHintText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  fabHintTextDanger: {
    color: "#B91C1C",
  },
  fabButton: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
