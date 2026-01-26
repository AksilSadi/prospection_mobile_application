import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabRoute = {
  key: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
};

type BottomTabsProps = {
  routes: TabRoute[];
  index: number;
  onTabPress: (index: number) => void;
};

export default function BottomTabs({ routes, index, onTabPress }: BottomTabsProps) {
  const insets = useSafeAreaInsets();
  const tabAnims = useRef(routes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = tabAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: i === index ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(animations).start();
  }, [index, tabAnims]);

  return (
    <View style={[styles.container, { paddingBottom: 10 + insets.bottom }]}>
      {routes.map((route, routeIndex) => {
        const isActive = index === routeIndex;
        const color = isActive ? "#2563EB" : "#94A3B8";
        const progress = tabAnims[routeIndex];
        const scale = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [2, 0],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        });

        return (
          <Pressable
            key={route.key}
            onPress={() => onTabPress(routeIndex)}
            style={styles.tab}
          >
            <Animated.View
              style={[
                styles.tabContent,
                {
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
              ]}
            >
              <View style={styles.activeBarWrap}>
                <View
                  style={[
                    styles.activeBar,
                    { opacity: isActive ? 1 : 0 },
                  ]}
                />
              </View>
              <Feather name={route.icon} size={20} color={color} />
              <Text style={[styles.label, { color }]}>{route.title}</Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  activeBarWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 6,
  },
  activeBar: {
    width: "60%",
    height: 3,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
