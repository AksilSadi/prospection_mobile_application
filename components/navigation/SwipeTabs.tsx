import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabView } from "react-native-tab-view";
import BottomTabs from "@/components/navigation/BottomTabs";
import DashboardScreen from "@/app/(app)/(tabs)/dashboard";
import ImmeublesScreen from "@/app/(app)/(tabs)/immeubles";
import HistoriqueScreen from "@/app/(app)/(tabs)/historique";

const routes = [
  { key: "dashboard", title: "Dashboard", icon: "bar-chart-2" },
  { key: "immeubles", title: "Immeubles", icon: "home" },
  { key: "historique", title: "Historique", icon: "clock" },
];

type SwipeTabsProps = {
  index: number;
  onIndexChange: (index: number) => void;
};

export default function SwipeTabs({ index, onIndexChange }: SwipeTabsProps) {
  const tabRoutes = useMemo(() => routes, []);
  const [swipeEnabled, setSwipeEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes: tabRoutes }}
        renderScene={({ route }) => {
          if (route.key === "immeubles") {
            return (
              <ImmeublesScreen
                isActive={index === 1}
                onSwipeLockChange={(locked) => setSwipeEnabled(!locked)}
              />
            );
          }
          if (route.key === "historique") {
            return <HistoriqueScreen />;
          }
          return <DashboardScreen />;
        }}
        onIndexChange={onIndexChange}
        renderTabBar={() => null}
        swipeEnabled={swipeEnabled}
        lazy
      />
      <BottomTabs routes={tabRoutes} index={index} onTabPress={onIndexChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
