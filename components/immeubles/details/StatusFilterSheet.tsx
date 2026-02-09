import { Feather } from "@expo/vector-icons";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { ReactElement, RefObject } from "react";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

type StatusOption = {
  value: string;
  label: string;
  description: string;
  bg: string;
  fg: string;
  accent: string;
  icon: keyof typeof Feather.glyphMap;
};

type StatusFilterSheetProps = {
  filterSheetRef: RefObject<BottomSheetModal | null>;
  filterSnapPoints: string[];
  renderSheetBackdrop: (props: any, opacity: number) => ReactElement;
  statusCounts: Record<string, number>;
  pendingStatusFilter: string | null;
  statusOptions: StatusOption[];
  totalCount: number;
  isTablet: boolean;
  onSheetClose: () => void;
  togglePendingFilter: (value: string | null) => void;
  clearStatusFilters: () => void;
  applyStatusFilters: () => void;
  styles: Record<string, any>;
};

function StatusFilterSheet({
  filterSheetRef,
  filterSnapPoints,
  renderSheetBackdrop,
  statusCounts,
  pendingStatusFilter,
  statusOptions,
  totalCount,
  isTablet,
  onSheetClose,
  togglePendingFilter,
  clearStatusFilters,
  applyStatusFilters,
  styles,
}: StatusFilterSheetProps) {
  const applyCount =
    pendingStatusFilter === null
      ? totalCount
      : (statusCounts[pendingStatusFilter] ?? 0);
  return (
    <BottomSheetModal
      ref={filterSheetRef}
      snapPoints={filterSnapPoints}
      enablePanDownToClose
      backdropComponent={(props) => renderSheetBackdrop(props, 0.5)}
      onChange={(index) => {
        if (index === -1) onSheetClose();
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

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionLabel}>Filtrer par statut</Text>
          <View style={styles.filterRadioGroup}>
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
                <Text style={styles.filterRadioBadgeText}>{totalCount}</Text>
              </View>
            </Pressable>

            {statusOptions.map((option) => {
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
                  onPress={() => count > 0 && togglePendingFilter(option.value)}
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
                          count === 0 && styles.filterRadioDescriptionDisabled,
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

        <View style={styles.filterSheetFooter}>
          <Pressable
            style={styles.filterApplyButton}
            onPress={applyStatusFilters}
          >
            <Text style={styles.filterApplyButtonText}>
              Appliquer ({applyCount})
            </Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

export default memo(StatusFilterSheet);
