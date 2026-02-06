import { Animated, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { memo } from "react";

type ActionToastProps = {
  topInset: number;
  title: string;
  subtitle: string;
  opacity: Animated.Value;
  translateY: Animated.Value;
  styles: {
    toastOverlay: StyleProp<ViewStyle>;
    toastCard: StyleProp<ViewStyle>;
    toastTitle: any;
    toastSubtitle: any;
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
  return (
    <View style={[styles.toastOverlay, { top: topInset + 8 }]}>
      <Animated.View
        style={[
          styles.toastCard,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        <Text style={styles.toastTitle}>{title}</Text>
        <Text style={styles.toastSubtitle}>{subtitle}</Text>
      </Animated.View>
    </View>
  );
}

export default memo(ActionToast);
