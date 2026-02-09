import { Animated, Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { memo } from "react";
import { Feather } from "@expo/vector-icons";

type ActionToastProps = {
  topInset: number;
  title: string;
  subtitle: string;
  opacity: Animated.Value;
  translateY: Animated.Value;
  styles: {
    toastOverlay: StyleProp<ViewStyle>;
    toastCard: StyleProp<ViewStyle>;
    toastIcon: StyleProp<ViewStyle>;
    toastText: StyleProp<ViewStyle>;
    toastTitle: StyleProp<TextStyle>;
    toastSubtitle: StyleProp<TextStyle>;
  };
};

function ActionToast({
  topInset,
  title,
  subtitle,
  opacity,
  translateY,
  styles,
}: ActionToastProps) {
  const isError = title.toLowerCase().includes("erreur");
  const iconName: keyof typeof Feather.glyphMap = isError
    ? "alert-circle"
    : "check";
  const iconBg = isError ? "#EF4444" : "#34D399";

  return (
    <View style={[styles.toastOverlay, { top: topInset + 8 }]}>
      <Animated.View
        style={[
          styles.toastCard,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.toastIcon, { backgroundColor: iconBg }]}>
          <Feather name={iconName} size={14} color="#FFFFFF" />
        </View>
        <View style={styles.toastText}>
          <Text style={styles.toastTitle}>{title}</Text>
          <Text style={styles.toastSubtitle}>{subtitle}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default memo(ActionToast);
