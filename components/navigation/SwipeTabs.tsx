import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabView } from "react-native-tab-view";
import HamburgerButton from "@/components/navigation/HamburgerButton";
import HamburgerMenuOverlay from "@/components/navigation/HamburgerMenuOverlay";
import DashboardScreen from "@/app/(app)/(tabs)/dashboard";
import ImmeublesScreen from "@/app/(app)/(tabs)/immeubles";
import StatistiquesScreen from "@/app/(app)/(tabs)/statistiques";
import EquipeScreen from "@/app/(app)/(tabs)/equipe";
import HistoriqueScreen from "@/app/(app)/(tabs)/historique";
import { useHamburgerMenu } from "@/hooks/use-hamburger-menu";
import { authService } from "@/services/auth";

const buildRoutes = (isManager: boolean) => {
  const baseRoutes = [
    { key: "dashboard", title: "Dashboard", icon: "bar-chart-2" },
    { key: "immeubles", title: "Immeubles", icon: "home" },
    { key: "statistiques", title: "Statistiques", icon: "trending-up" },
  ];
  if (isManager) {
    baseRoutes.push({ key: "equipe", title: "Équipe", icon: "users" });
  }
  baseRoutes.push({ key: "historique", title: "Historique", icon: "clock" });
  return baseRoutes;
};

type SwipeTabsProps = {
  index: number;
  onIndexChange: (index: number) => void;
  onHeaderVisibilityChange?: (visible: boolean) => void;
};

export default function SwipeTabs({
  index,
  onIndexChange,
  onHeaderVisibilityChange,
}: SwipeTabsProps) {
  const [isManager, setIsManager] = useState(false);
  const tabRoutes = useMemo(() => buildRoutes(isManager), [isManager]);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const [showHamburger, setShowHamburger] = useState(true);
  const { close, isVisible } = useHamburgerMenu();

  useEffect(() => {
    const loadRole = async () => {
      const role = await authService.getUserRole();
      setIsManager(role === "manager");
    };
    void loadRole();
  }, []);

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
                onHeaderVisibilityChange={onHeaderVisibilityChange}
              />
            );
          }
          if (route.key === "historique") {
            return <HistoriqueScreen />;
          }
          if (route.key === "equipe") {
            return <EquipeScreen />;
          }
          if (route.key === "statistiques") {
            return <StatistiquesScreen />;
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
