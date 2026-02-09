import AddPorteSheet, {
  type AddPortePayload,
} from "@/components/immeubles/AddPorteSheet";
import ConfirmActionOverlay from "@/components/immeubles/ConfirmActionOverlay";
import ActionToast from "@/components/immeubles/details/ActionToast";
import DetailsHeader from "@/components/immeubles/details/DetailsHeader";
import EditPorteSheet from "@/components/immeubles/details/EditPorteSheet";
import FloorPlanSheet from "@/components/immeubles/details/FloorPlanSheet";
import StatusFilterSheet from "@/components/immeubles/details/StatusFilterSheet";
import { useAddEtageToImmeuble } from "@/hooks/api/use-add-etage-to-immeuble";
import { useCreatePorte } from "@/hooks/api/use-create-porte";
import { useRemoveEtageFromImmeuble } from "@/hooks/api/use-remove-etage-from-immeuble";
import { useRemovePorteFromEtage } from "@/hooks/api/use-remove-porte-from-etage";
import { useUpdatePorte } from "@/hooks/api/use-update-porte";
import { useRecording } from "@/hooks/audio/use-recording";
import type {
  CreatePorteInput,
  Immeuble,
  Porte,
  UpdatePorteInput,
} from "@/types/api";
import { Feather } from "@expo/vector-icons";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import type { ComponentType, RefObject } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

type FabAction = {
  label: string;
  subLabel: string;
  icon: keyof typeof Feather.glyphMap;
  tone: "primary" | "danger";
  onPress: () => void;
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

const DEFAULT_STATUS_OPTION: StatusOption = {
  value: "NON_VISITE",
  label: "Non visite",
  description: "Par defaut",
  bg: "#E2E8F0",
  fg: "#475569",
  accent: "#CBD5F5",
  icon: "circle",
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

type ProgressCardProps = {
  progress: {
    total: number;
    visited: number;
    percentage: number;
  };
  progressFill: Animated.Value;
  isTablet: boolean;
};

const ProgressCard = memo(function ProgressCard({
  progress,
  progressFill,
  isTablet,
}: ProgressCardProps) {
  return (
    <View
      style={[styles.progressCardNew, isTablet && styles.progressCardNewTablet]}
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
  );
});

type FloorTabsProps = {
  floors: number[];
  currentEtage?: number;
  onJumpToFloor: (etage: number) => void;
};

const FloorTabs = memo(function FloorTabs({
  floors,
  currentEtage,
  onJumpToFloor,
}: FloorTabsProps) {
  return (
    <View style={styles.floorTabsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.floorTabsScroll}
        contentContainerStyle={styles.floorTabs}
      >
        {floors.map((etage) => {
          const isActive = currentEtage === etage;
          return (
            <Pressable
              key={`floor-${etage}`}
              style={[styles.floorTab, isActive && styles.floorTabActive]}
              onPress={() => onJumpToFloor(etage)}
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
  );
});

type DoorPagerItemProps = {
  item: Porte;
  width: number;
  visibleStatusOptions: StatusOption[];
  onStatusSelect: (statut: string, target?: Porte) => Promise<void>;
};

const DoorPagerItem = memo(
  function DoorPagerItem({
    item,
    width,
    visibleStatusOptions,
    onStatusSelect,
  }: DoorPagerItemProps) {
    const status = getDisplayStatus(item) ?? DEFAULT_STATUS_OPTION;

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
                <Feather name="layers" size={12} color="#64748B" />
                <Text style={styles.doorFloorText}>
                  Etage {item.etage ?? "--"}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <View
                style={[
                  styles.statusDotBadge,
                  { backgroundColor: status.accent },
                ]}
              />
              <Text style={[styles.statusBadgeText, { color: status.fg }]}>
                {status.label}
              </Text>
            </View>
          </View>

          <View style={styles.statusGrid}>
            {visibleStatusOptions.map((option) => {
              const isActiveStatus = getDisplayStatusKey(item) === option.value;
              const cardBg = isActiveStatus ? option.accent : option.bg;
              const cardBorder = isActiveStatus ? option.accent : "#E2E8F0";
              const labelColor = isActiveStatus ? "#FFFFFF" : option.fg;
              const descColor = isActiveStatus
                ? "rgba(255, 255, 255, 0.9)"
                : option.fg;
              const iconBg = isActiveStatus
                ? "rgba(255, 255, 255, 0.2)"
                : option.accent;
              const iconColor = isActiveStatus ? "#FFFFFF" : option.fg;

              return (
                <View key={option.value} style={styles.statusCardWrap}>
                  <Pressable
                    style={[
                      styles.statusCard,
                      { backgroundColor: cardBg, borderColor: cardBorder },
                    ]}
                    onPress={() => {
                      void onStatusSelect(option.value, item);
                    }}
                  >
                    <View
                      style={[styles.statusIcon, { backgroundColor: iconBg }]}
                    >
                      <Feather name={option.icon} size={16} color={iconColor} />
                    </View>
                    <Text style={[styles.statusLabel, { color: labelColor }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.statusDesc, { color: descColor }]}>
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
  },
  (prev, next) => {
    return (
      prev.item === next.item &&
      prev.width === next.width &&
      prev.visibleStatusOptions === next.visibleStatusOptions &&
      prev.onStatusSelect === next.onStatusSelect
    );
  },
);

type DoorPagerProps = {
  doorPagerRef: RefObject<FlatList<Porte> | null>;
  filteredPortes: Porte[];
  width: number;
  onMomentumScrollEnd: (event: any) => void;
  visibleStatusOptions: StatusOption[];
  onStatusSelect: (statut: string, target?: Porte) => Promise<void>;
};

const DoorPager = memo(function DoorPager({
  doorPagerRef,
  filteredPortes,
  width,
  onMomentumScrollEnd,
  visibleStatusOptions,
  onStatusSelect,
}: DoorPagerProps) {
  const keyExtractor = useCallback((item: Porte) => String(item.id), []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Porte> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const renderItem = useCallback(
    ({ item }: { item: Porte }) => (
      <DoorPagerItem
        item={item}
        width={width}
        visibleStatusOptions={visibleStatusOptions}
        onStatusSelect={onStatusSelect}
      />
    ),
    [onStatusSelect, visibleStatusOptions, width],
  );

  return (
    <FlatList
      ref={doorPagerRef}
      data={filteredPortes}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={keyExtractor}
      onMomentumScrollEnd={onMomentumScrollEnd}
      style={styles.doorPager}
      getItemLayout={getItemLayout}
      windowSize={3}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      updateCellsBatchingPeriod={16}
      removeClippedSubviews
      contentContainerStyle={styles.doorPagerContent}
      ListEmptyComponent={
        <View style={styles.emptyFilterCard}>
          <Feather name="filter" size={20} color="#94A3B8" />
          <Text style={styles.emptyFilterTitle}>Aucune porte trouvee</Text>
          <Text style={styles.emptyFilterText}>
            Aucun resultat avec ce filtre.
          </Text>
        </View>
      }
      renderItem={renderItem}
    />
  );
});

type ImmeubleDetailsViewProps = {
  immeuble: Immeuble;
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onRefreshImmeuble?: () => void | Promise<void>;
};

function ImmeubleDetailsView({
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
  const progressAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const lastProgressTargetRef = useRef(0);
  const doorPagerRef = useRef<FlatList<Porte>>(null);
  const filteredPortesRef = useRef<Porte[]>([]);
  const currentPorteRef = useRef<Porte | undefined>(undefined);
  const { error: recordingError } = useRecording({
    enabled: true,
    immeubleId: immeuble.id,
  });
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
    "RENDEZ_VOUS_PRIS" | "CONTRAT_SIGNE" | "ARGUMENTE" | null
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
  const openDatePicker = useCallback(() => setShowDatePicker(true), []);
  const openTimePicker = useCallback(() => setShowTimePicker(true), []);
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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const handleFilterSheetClose = useCallback(() => {
    setPendingStatusFilter(statusFilters[0] ?? null);
  }, [statusFilters]);

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
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    }, 60);
    return () => clearTimeout(timeoutId);
  }, [contentOpacity, contentTranslate, isReady]);

  // G�rer l'ouverture de la bottom sheet du plan rapide
  useEffect(() => {
    if (!showFloorPlan) return;
    floorPlanSheetRef.current?.present();
  }, [showFloorPlan]);

  useEffect(() => {
    if (!editMode || !editPorte) return;
    editSheetRef.current?.present();
  }, [editMode, editPorte]);

  useEffect(() => {
    if (!recordingError) return;
    console.log("[Recording] start failed", recordingError);
  }, [recordingError]);

  const triggerFloorPlan = useCallback(() => {
    setShowFloorPlan(true);
    floorPlanScale.setValue(1);
    floorPlanPulse.setValue(0);
  }, [floorPlanPulse, floorPlanScale]);

  const showToast = useCallback(
    (title: string, subtitle: string) => {
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
            duration: 140,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslate, {
            toValue: -8,
            duration: 140,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setActionToast(null);
        });
      }, 1400);
    },
    [toastOpacity, toastTranslate],
  );

  const updateLocalPorte = useCallback(
    (porteId: number, changes: Partial<Porte>) => {
      setPortesState((prev) =>
        prev.map((porte) =>
          porte.id === porteId ? { ...porte, ...changes } : porte,
        ),
      );
      if (onDirtyChange) onDirtyChange(true);
    },
    [onDirtyChange],
  );

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
  const getDateValue = (value: string) => {
    if (!value) return new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00`);
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date();
  };
  const getTimeValue = (value: string) => {
    if (!value) return new Date();
    const [hh, mm] = value.split(":");
    const now = new Date();
    now.setHours(Number(hh) || 0);
    now.setMinutes(Number(mm) || 0);
    now.setSeconds(0);
    return now;
  };

  const openEditSheet = useCallback(
    (porte: Porte, mode: "RENDEZ_VOUS_PRIS" | "CONTRAT_SIGNE" | "ARGUMENTE") => {
      setEditPorte(porte);
      setEditMode(mode);
      setEditForm({
        rdvDate: porte.rdvDate || getTodayDate(),
        rdvTime: porte.rdvTime || getNowTime(),
        nbContrats: porte.nbContrats || 1,
        commentaire: porte.commentaire || "",
        nomPersonnalise: porte.nomPersonnalise || "",
      });
    },
    [],
  );

  const closeEditSheet = useCallback(() => {
    editSheetRef.current?.dismiss();
    setEditPorte(null);
    setEditMode(null);
  }, []);

  const renderSheetBackdrop = useCallback(
    (props: any, opacity: number) => (
      <BottomSheetBackdrop
        {...(props ?? {})}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={opacity}
      />
    ),
    [],
  );

  const saveEditSheet = async () => {
    if (!editPorte || !editMode || savingPorte) return;
    if (editMode === "ARGUMENTE" && !editForm.commentaire.trim()) {
      showToast("Commentaire requis", "Ajoute un commentaire pour valider Argumente");
      return;
    }

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

  const handleDoorScrollEnd = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const nextIndex = Math.round(offsetX / Math.max(1, width));
      setCurrentIndex((prev) =>
        Math.max(0, Math.min(nextIndex, filteredPortes.length - 1)),
      );
    },
    [filteredPortes.length, width],
  );

  const currentPorte = filteredPortes[currentIndex];
  const currentStatus = getDisplayStatus(currentPorte) ?? DEFAULT_STATUS_OPTION;
  const currentPorteId = currentPorte?.id ?? null;

  useEffect(() => {
    filteredPortesRef.current = filteredPortes;
    currentPorteRef.current = currentPorte;
  }, [currentPorte, filteredPortes]);

  useEffect(() => {
    if (currentIndex >= filteredPortes.length) {
      setCurrentIndex(Math.max(0, filteredPortes.length - 1));
    }
  }, [currentIndex, filteredPortes.length]);

  const porteSummary = useMemo(() => {
    const floorSet = new Set<number>();
    const counts: Record<string, number> = {};
    let visited = 0;

    for (const porte of sortedPortes) {
      floorSet.add(porte.etage);
      if (porte.statut && porte.statut !== "NON_VISITE") {
        visited += 1;
      }

      const key = getDisplayStatusKey(porte);
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    }

    const total = sortedPortes.length;
    return {
      progress: {
        total,
        visited,
        percentage: total ? Math.round((visited / total) * 100) : 0,
      },
      floors: Array.from(floorSet).sort((a, b) => b - a),
      statusCounts: counts,
    };
  }, [sortedPortes]);

  const portesParEtage = useMemo(() => {
    if (!showFloorPlan) return [] as [number, Porte[]][];
    const groupedByFloor = new Map<number, Porte[]>();
    for (const porte of sortedPortes) {
      if (!groupedByFloor.has(porte.etage)) {
        groupedByFloor.set(porte.etage, []);
      }
      groupedByFloor.get(porte.etage)?.push(porte);
    }
    return Array.from(groupedByFloor.entries()).sort((a, b) => b[0] - a[0]);
  }, [showFloorPlan, sortedPortes]);

  const progress = porteSummary.progress;
  const floors = porteSummary.floors;
  const statusCounts = porteSummary.statusCounts;

  useEffect(() => {
    const targetValue = progress.percentage;

    if (lastProgressTargetRef.current === targetValue) {
      return;
    }

    lastProgressTargetRef.current = targetValue;

    progressAnimationRef.current?.stop();
    progressFill.stopAnimation((currentValue: number) => {
      const delta = Math.abs(targetValue - currentValue);
      if (delta < 0.2) {
        progressFill.setValue(targetValue);
        return;
      }

      const duration = Math.max(260, Math.min(520, 220 + delta * 8));
      progressAnimationRef.current = Animated.timing(progressFill, {
        toValue: targetValue,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
        isInteraction: false,
      });
      progressAnimationRef.current.start(({ finished }) => {
        if (finished) {
          progressAnimationRef.current = null;
        }
      });
    });
  }, [progress.percentage, progressFill]);

  useEffect(() => {
    return () => {
      progressAnimationRef.current?.stop();
    };
  }, []);

  const visibleStatusOptions = STATUS_OPTIONS;

  const togglePendingFilter = useCallback((value: string | null) => {
    setPendingStatusFilter((prev) => (prev === value ? null : value));
  }, []);

  const applyStatusFilters = useCallback(() => {
    setStatusFilters(pendingStatusFilter ? [pendingStatusFilter] : []);
    filterSheetRef.current?.dismiss();
  }, [pendingStatusFilter]);

  const clearStatusFilters = useCallback(() => {
    setStatusFilters([]);
    setPendingStatusFilter(null);
    filterSheetRef.current?.dismiss();
  }, []);

  const jumpToFloor = useCallback(
    (etage: number) => {
      const targetIndex = filteredPortes.findIndex(
        (porte) => porte.etage === etage,
      );

      if (targetIndex === -1) {
        showToast("Aucune porte", "Ce filtre ne contient pas cet etage");
        return;
      }
      setCurrentIndex(targetIndex);
      doorPagerRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
      });
    },
    [filteredPortes, showToast],
  );

  const getNextDoorNumber = useCallback(
    (etage: number) => {
      const portesOnFloor = portesState.filter(
        (porte) => porte.etage === etage,
      );
      const numbers = portesOnFloor
        .map((porte) => Number(porte.numero))
        .filter((value) => !Number.isNaN(value));
      if (numbers.length > 0) {
        return String(Math.max(...numbers) + 1);
      }
      return String(portesOnFloor.length + 1);
    },
    [portesState],
  );

  const openAddPorte = useCallback(() => {
    const etage = (currentPorte?.etage ?? displayNbEtages) || 1;
    const numero = getNextDoorNumber(etage);
    setAddPorteDefaults({ etage, numero });
    setIsAddPorteOpen(true);
  }, [currentPorte?.etage, displayNbEtages, getNextDoorNumber]);

  const handleAddPorte = useCallback(
    async (payload: AddPortePayload) => {
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
      if (onDirtyChange) onDirtyChange(true);
      showToast(
        "Porte ajoutee",
        `Etage ${payload.etage} Porte ${payload.numero}`,
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
    },
    [createPorte, creatingPorte, immeuble.id, onDirtyChange, showToast],
  );

  const handleAddEtage = useCallback(async () => {
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
  }, [
    addEtageToImmeuble,
    addingEtage,
    displayNbEtages,
    immeuble.id,
    immeuble.nbPortesParEtage,
    onDirtyChange,
    onRefreshImmeuble,
    showToast,
  ]);

  const openDeletePorte = useCallback(() => {
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
  }, [currentPorte, portesState, showToast]);

  const confirmDeletePorte = useCallback(async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetFloor = deleteTarget.etage;
    const previous = portesState;
    const removedIndex = sortedPortes.findIndex(
      (porte) => porte.id === targetId,
    );
    const nextPortes = previous.filter((porte) => porte.id !== targetId);
    setPortesState(nextPortes);
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
  }, [
    deleteTarget,
    immeuble.id,
    onDirtyChange,
    portesState,
    removePorteFromEtage,
    showToast,
    sortedPortes,
  ]);

  const openDeleteEtage = useCallback(() => {
    if (removingEtage) return;
    const lastFloor = getMaxEtage(portesState, immeuble.nbEtages ?? 0);
    if (!lastFloor) {
      showToast("Aucun etage", "Impossible de supprimer");
      return;
    }
    setDeleteTarget(null);
    setDeleteFloor(lastFloor);
  }, [immeuble.nbEtages, portesState, removingEtage, showToast]);

  const confirmDeleteEtage = useCallback(async () => {
    if (deleteFloor === null) return;
    const targetFloor = deleteFloor;
    const previous = portesState;
    const nextPortes = previous.filter((porte) => porte.etage !== targetFloor);
    setPortesState(nextPortes);
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
  }, [
    deleteFloor,
    immeuble.id,
    onDirtyChange,
    portesState,
    removeEtageFromImmeuble,
    showToast,
  ]);

  const applyStatus = useCallback(
    async (porte: Porte, statut: string, extra?: { nbRepassages?: number }) => {
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
    },
    [showToast, updateLocalPorte, updatePorte],
  );

  const resetStatus = useCallback(
    async (porte: Porte) => {
      showToast(
        `Porte ${porte.nomPersonnalise || porte.numero}`,
        "Statut retire",
      );
      updateLocalPorte(porte.id, {
        statut: "NON_VISITE",
        nbRepassages: null,
        rdvDate: null,
        rdvTime: null,
        nbContrats: null,
        commentaire: null,
        derniereVisite: null,
      });
      const payload: UpdatePorteInput = {
        id: porte.id,
        statut: "NON_VISITE",
        rdvDate: null,
        rdvTime: null,
        commentaire: null,
        derniereVisite: null,
      };
      const result = await updatePorte(payload);
      if (!result) {
        showToast("Erreur", "Mise a jour impossible");
      }
    },
    [showToast, updateLocalPorte, updatePorte],
  );

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

  const advanceToNextDoor = useCallback((porteId: number, portes: Porte[]) => {
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
  }, []);

  const handleStatusSelect = useCallback(
    async (statut: string, target?: Porte) => {
      const porte = target ?? currentPorteRef.current;
      if (!porte) return;
      const currentKey = getDisplayStatusKey(porte);
      if (
        currentKey &&
        currentKey === statut &&
        statut !== "RENDEZ_VOUS_PRIS" &&
        statut !== "CONTRAT_SIGNE"
      ) {
        void resetStatus(porte);
        return;
      }
      if (statut === "RENDEZ_VOUS_PRIS" || statut === "CONTRAT_SIGNE") {
        openEditSheet(porte, statut);
        return;
      }
      if (statut === "ARGUMENTE") {
        openEditSheet(porte, "ARGUMENTE");
        return;
      }
      if (statut === "ABSENT_MATIN") {
        void applyStatus(porte, "ABSENT", { nbRepassages: 1 });
        advanceToNextDoor(porte.id, filteredPortesRef.current);
        return;
      }
      if (statut === "ABSENT_SOIR") {
        const nextRepassage = Math.max(2, porte.nbRepassages ?? 0);
        void applyStatus(porte, "ABSENT", {
          nbRepassages: nextRepassage,
        });
        advanceToNextDoor(porte.id, filteredPortesRef.current);
        return;
      }
      void applyStatus(porte, statut);
      advanceToNextDoor(porte.id, filteredPortesRef.current);
    },
    [advanceToNextDoor, applyStatus, openEditSheet, resetStatus],
  );

  const fabActions = useMemo<FabAction[]>(
    () => [
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
    ],
    [handleAddEtage, openAddPorte, openDeleteEtage, openDeletePorte],
  );

  const openStatusFilterSheet = useCallback(() => {
    setPendingStatusFilter(statusFilters[0] ?? null);
    setIsFilterSheetOpen(true);
    requestAnimationFrame(() => {
      filterSheetRef.current?.present();
    });
  }, [statusFilters]);

  const floorPlanKeyExtractor = useCallback(
    (entry: [number, Porte[]]) => `floor-${entry[0]}`,
    [],
  );

  const renderFloorPlanSection = useCallback(
    ({ item }: { item: [number, Porte[]] }) => {
      const [etage, portes] = item;
      return (
        <View style={styles.floorPlanEtageSection}>
          <Text style={styles.floorPlanEtageLabel}>Étage {etage}</Text>
          <View style={styles.floorPlanDoorsGrid}>
            {portes.map((porte) => {
              const status = getDisplayStatus(porte);
              const isActive = porte.id === currentPorteId;
              const isVisited = status !== null;
              const chipBg = isVisited ? status?.accent : "#F1F5F9";
              const chipBorder = isActive ? status?.accent : "transparent";
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
                    style={[styles.floorPlanDoorChipText, { color: chipText }]}
                  >
                    {porte.nomPersonnalise || porte.numero}
                  </Text>
                  {isActive && <View style={styles.floorPlanActiveIndicator} />}
                </View>
              );
            })}
          </View>
        </View>
      );
    },
    [currentPorteId],
  );

  return (
    <View style={styles.container}>
      <DetailsHeader
        topInset={insets.top}
        adresse={immeuble.adresse}
        nbEtages={displayNbEtages}
        nbPortesParEtage={immeuble.nbPortesParEtage}
        onBack={() => setShowExitConfirm(true)}
        onOpenFloorPlan={triggerFloorPlan}
        floorPlanScale={floorPlanScale}
        floorPlanPulse={floorPlanPulse}
        styles={styles}
      />

      {actionToast ? (
        <ActionToast
          topInset={insets.top}
          title={actionToast.title}
          subtitle={actionToast.subtitle}
          opacity={toastOpacity}
          translateY={toastTranslate}
          styles={styles}
        />
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
              <ProgressCard
                progress={progress}
                progressFill={progressFill}
                isTablet={isTablet}
              />

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
                  onPress={openStatusFilterSheet}
                >
                  <Feather name="filter" size={15} color="#FFFFFF" />
                  <Text style={styles.statusFilterText}>Filtrer</Text>
                </Pressable>
              </View>

              <FloorTabs
                floors={floors}
                currentEtage={currentPorte?.etage}
                onJumpToFloor={jumpToFloor}
              />

              <DoorPager
                doorPagerRef={doorPagerRef}
                filteredPortes={filteredPortes}
                width={width}
                onMomentumScrollEnd={handleDoorScrollEnd}
                visibleStatusOptions={visibleStatusOptions}
                onStatusSelect={handleStatusSelect}
              />
            </ScrollView>
          </Animated.View>
        </>
      )}

      <EditPorteSheet
        editMode={editMode}
        editPorte={editPorte}
        editForm={editForm}
        setEditForm={setEditForm}
        savingPorte={savingPorte}
        hasNativePicker={hasNativePicker}
        isTablet={isTablet}
        editSnapPoints={editSnapPoints}
        editSheetRef={editSheetRef}
        renderSheetBackdrop={renderSheetBackdrop}
        openDatePicker={openDatePicker}
        openTimePicker={openTimePicker}
        closeEditSheet={closeEditSheet}
        saveEditSheet={saveEditSheet}
        formatDateLabel={formatDateLabel}
        formatTimeLabel={formatTimeLabel}
        styles={styles}
      />

      <FloorPlanSheet
        showFloorPlan={showFloorPlan}
        setShowFloorPlan={setShowFloorPlan}
        floorPlanSnapPoints={floorPlanSnapPoints}
        floorPlanSheetRef={floorPlanSheetRef}
        renderSheetBackdrop={renderSheetBackdrop}
        portesParEtage={portesParEtage}
        sortedPortesCount={sortedPortes.length}
        floorsCount={portesParEtage.length}
        currentPorte={currentPorte}
        currentStatus={currentStatus}
        isTablet={isTablet}
        floorPlanKeyExtractor={floorPlanKeyExtractor}
        renderFloorPlanSection={renderFloorPlanSection}
        styles={styles}
      />
      {isFilterSheetOpen ? (
        <StatusFilterSheet
          filterSheetRef={filterSheetRef}
          filterSnapPoints={filterSnapPoints}
          renderSheetBackdrop={renderSheetBackdrop}
          statusCounts={statusCounts}
          pendingStatusFilter={pendingStatusFilter}
          statusOptions={visibleStatusOptions}
          totalCount={sortedPortes.length}
          isTablet={isTablet}
          onSheetClose={() => {
            handleFilterSheetClose();
            setIsFilterSheetOpen(false);
          }}
          togglePendingFilter={togglePendingFilter}
          clearStatusFilters={clearStatusFilters}
          applyStatusFilters={applyStatusFilters}
          styles={styles}
        />
      ) : null}

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
            onChange={(_event: unknown, selected?: Date) => {
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
            onChange={(_event: unknown, selected?: Date) => {
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
          {fabActions.map((action, index, items) => {
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
              dirX * hintDistance,
            );
            const hintTranslateY = Animated.add(
              translateY,
              dirY * hintDistance,
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
              Tu vas revenir a la liste des immeubles. Continuer ?
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
  floorPlanSectionList: {
    paddingBottom: 12,
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
  sheetHeroArgument: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FCD9B8",
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
  sheetHeroIconAmber: {
    backgroundColor: "#FFF4E8",
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
  sheetCardArgument: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FCD9B8",
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
  sheetSectionIconAmber: {
    backgroundColor: "#FFF4E8",
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

export default memo(ImmeubleDetailsView);
