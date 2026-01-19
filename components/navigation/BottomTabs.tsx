import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

  return (
    <View style={[styles.container, { paddingBottom: 10 + insets.bottom }]}>
      {routes.map((route, routeIndex) => {
        const isActive = index === routeIndex;
        const color = isActive ? "#2563EB" : "#94A3B8";

        return (
          <Pressable
            key={route.key}
            onPress={() => onTabPress(routeIndex)}
            style={styles.tab}
          >
            <Feather name={route.icon} size={20} color={color} />
            <Text style={[styles.label, { color }]}>{route.title}</Text>
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
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
