import { useProfileSheet } from "@/hooks/use-profile-sheet";
import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AnimatedHeaderProps = {
  currentIndex: number;
};

const PAGE_TITLES = ["Dashboard", "Immeubles", "Historique"];

export default function AnimatedHeader({ currentIndex }: AnimatedHeaderProps) {
  const { open } = useProfileSheet();
  const insets = useSafeAreaInsets();

  const fadeAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const translateAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(20),
    new Animated.Value(20),
  ]).current;

  useEffect(() => {
    PAGE_TITLES.forEach((_, index) => {
      const isActive = index === currentIndex;
      Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: isActive ? 1 : 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnims[index], {
          toValue: isActive ? 0 : 20,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [currentIndex, fadeAnims, translateAnims]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          {PAGE_TITLES.map((title, index) => (
            <Animated.Text
              key={title}
              style={[
                styles.title,
                {
                  opacity: fadeAnims[index],
                  transform: [{ translateY: translateAnims[index] }],
                  position: index === 0 ? "relative" : "absolute",
                  left: index === 0 ? undefined : 0,
                },
              ]}
            >
              {title}
            </Animated.Text>
          ))}
        </View>

        <Pressable style={styles.profileButton} onPress={open}>
          <View style={styles.profileIcon}>
            <Feather name="user" size={18} color="#2563EB" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  titleContainer: {
    flex: 1,
    height: 32,
    justifyContent: "center",
    position: "relative",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  profileButton: {
    marginLeft: 12,
  },
  profileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
});
