import { Feather } from "@expo/vector-icons";
import { memo } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

type DetailsHeaderProps = {
  topInset: number;
  adresse: string;
  nbEtages: number;
  nbPortesParEtage: number;
  onBack: () => void;
  onOpenFloorPlan: () => void;
  floorPlanScale: Animated.Value;
  floorPlanPulse: Animated.Value;
  styles: {
    header: StyleProp<ViewStyle>;
    backButton: StyleProp<ViewStyle>;
    backButtonPressed: StyleProp<ViewStyle>;
    headerText: StyleProp<ViewStyle>;
    headerTitle: any;
    headerSubtitle: any;
    floorPlanButton: StyleProp<ViewStyle>;
    floorPlanPulse: StyleProp<ViewStyle>;
  };
};

function DetailsHeader({
  topInset,
  adresse,
  nbEtages,
  nbPortesParEtage,
  onBack,
  onOpenFloorPlan,
  floorPlanScale,
  floorPlanPulse,
  styles,
}: DetailsHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        android_ripple={{ color: "transparent", borderless: true }}
        onPress={onBack}
      >
        <Feather name="arrow-left" size={18} color="#2563EB" />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {adresse}
        </Text>
        <Text style={styles.headerSubtitle}>
          {nbEtages} etages - {nbPortesParEtage} portes/etage
        </Text>
      </View>
      <Pressable style={styles.floorPlanButton} onPress={onOpenFloorPlan}>
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
  );
}

export default memo(DetailsHeader);
