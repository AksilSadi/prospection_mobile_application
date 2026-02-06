import { useHamburgerMenu } from "@/hooks/use-hamburger-menu";
import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HamburgerButtonProps = {
  position?: "top-left" | "bottom-left";
};

export default function HamburgerButton({ position = "bottom-left" }: HamburgerButtonProps) {
  const { open, isVisible } = useHamburgerMenu();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isVisible, rotateAnim]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "90deg"],
  });

  const containerStyle = useMemo(
    () =>
      position === "top-left"
        ? [styles.container, styles.topLeft, { top: insets.top + 8 }]
        : [styles.container, styles.bottomLeft, { bottom: insets.bottom + 16 }],
    [insets.bottom, insets.top, position],
  );

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        style={styles.button}
        onPress={open}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Feather name="menu" size={22} color="#FFFFFF" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 999,
  },
  topLeft: {
    left: 16,
  },
  bottomLeft: {
    left: 16,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
});
