import { Feather } from "@expo/vector-icons";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import type { ReactElement, RefObject } from "react";
import { memo } from "react";
import { Text, View } from "react-native";

import type { Porte } from "@/types/api";

type StatusOption = {
  value: string;
  label: string;
  description: string;
  bg: string;
  fg: string;
  accent: string;
  icon: keyof typeof Feather.glyphMap;
};

type FloorPlanSheetProps = {
  showFloorPlan: boolean;
  setShowFloorPlan: (next: boolean) => void;
  floorPlanSnapPoints: string[];
  floorPlanSheetRef: RefObject<BottomSheetModal | null>;
  renderSheetBackdrop: (props: any, opacity: number) => ReactElement;
  portesParEtage: [number, Porte[]][];
  sortedPortesCount: number;
  floorsCount: number;
  currentPorte: Porte | undefined;
  currentStatus: StatusOption | null;
  isTablet: boolean;
  floorPlanKeyExtractor: (item: [number, Porte[]]) => string;
  renderFloorPlanSection: ({
    item,
  }: {
    item: [number, Porte[]];
  }) => ReactElement | null;
  styles: Record<string, any>;
};

function FloorPlanSheet({
  showFloorPlan,
  setShowFloorPlan,
  floorPlanSnapPoints,
  floorPlanSheetRef,
  renderSheetBackdrop,
  portesParEtage,
  sortedPortesCount,
  floorsCount,
  currentPorte,
  currentStatus,
  isTablet,
  floorPlanKeyExtractor,
  renderFloorPlanSection,
  styles,
}: FloorPlanSheetProps) {
  if (!showFloorPlan) return null;

  return (
    <BottomSheetModal
      ref={floorPlanSheetRef}
      index={1}
      snapPoints={floorPlanSnapPoints}
      enablePanDownToClose
      onChange={(index) => {
        if (index === -1) setShowFloorPlan(false);
      }}
      backdropComponent={(props) => renderSheetBackdrop(props, 0.4)}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetFlatList
        data={portesParEtage}
        keyExtractor={floorPlanKeyExtractor}
        renderItem={renderFloorPlanSection}
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        contentContainerStyle={[
          styles.sheetContent,
          isTablet && styles.sheetContentTablet,
          styles.floorPlanSectionList,
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.floorPlanHero}>
              <View style={styles.floorPlanHeroIcon}>
                <Feather name="grid" size={22} color="#2563EB" />
              </View>
              <View style={styles.floorPlanHeroText}>
                <Text style={styles.floorPlanTitle}>
                  Plan de l&apos;immeuble
                </Text>
                <Text style={styles.floorPlanSubtitle}>
                  {sortedPortesCount} portes • {floorsCount} etages
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
            </View>
          </>
        }
      />
    </BottomSheetModal>
  );
}

export default memo(FloorPlanSheet);
