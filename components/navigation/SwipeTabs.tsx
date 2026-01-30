import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabView } from "react-native-tab-view";
import HamburgerButton from "@/components/navigation/HamburgerButton";
import HamburgerMenuOverlay from "@/components/navigation/HamburgerMenuOverlay";
import DashboardScreen from "@/app/(app)/(tabs)/dashboard";
import ImmeublesScreen from "@/app/(app)/(tabs)/immeubles";
import HistoriqueScreen from "@/app/(app)/(tabs)/historique";
import { useHamburgerMenu } from "@/hooks/use-hamburger-menu";

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
  const [showHamburger, setShowHamburger] = useState(true);
  const { close, isVisible } = useHamburgerMenu();

  useEffect(() => {
    if (!showHamburger && isVisible) {
      close();
    }
  }, [close, isVisible, showHamburger]);

  useEffect(() => {
    if (index !== 1) {
      setShowHamburger(true);
    }
  }, [index]);

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
                onHamburgerVisibilityChange={setShowHamburger}
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
      {showHamburger ? (
        <>
          <HamburgerButton position="bottom-left" />
          <HamburgerMenuOverlay currentIndex={index} onNavigate={onIndexChange} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
