import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabView } from "react-native-tab-view";
import AgendaScreen from "@/app/(app)/(tabs)/agenda";
import DashboardScreen from "@/app/(app)/(tabs)/dashboard";
import ImmeublesScreen from "@/app/(app)/(tabs)/immeubles";
import StatistiquesScreen from "@/app/(app)/(tabs)/statistiques";
import EquipeScreen from "@/app/(app)/(tabs)/equipe";
import HistoriqueScreen from "@/app/(app)/(tabs)/historique";
import { authService } from "@/services/auth";

const buildRoutes = (isManager: boolean) => {
  const baseRoutes = [
    { key: "dashboard", title: "Dashboard", icon: "bar-chart-2" },
    { key: "immeubles", title: "Immeubles", icon: "home" },
    { key: "agenda", title: "Agenda", icon: "book-open" },
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
  onRailVisibilityChange?: (visible: boolean) => void;
};

export default function SwipeTabs({
  index,
  onIndexChange,
  onHeaderVisibilityChange,
  onRailVisibilityChange,
}: SwipeTabsProps) {
  const [isManager, setIsManager] = useState(false);
  const tabRoutes = useMemo(() => buildRoutes(isManager), [isManager]);
  const [swipeEnabled, setSwipeEnabled] = useState(true);
  const pendingImmeubleIdRef = useRef<number | null>(null);
  const [autoSelectImmeubleId, setAutoSelectImmeubleId] = useState<number | null>(null);

  const handleNavigateToImmeuble = useCallback(
    (immeubleId: number) => {
      const immeublesTabIdx = tabRoutes.findIndex((r) => r.key === "immeubles");
      if (immeublesTabIdx < 0) return;
      pendingImmeubleIdRef.current = immeubleId;
      setAutoSelectImmeubleId(immeubleId);
      onIndexChange(immeublesTabIdx);
    },
    [onIndexChange, tabRoutes],
  );

  const handleAutoSelectConsumed = useCallback(() => {
    pendingImmeubleIdRef.current = null;
    setAutoSelectImmeubleId(null);
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const role = await authService.getUserRole();
      setIsManager(role === "manager");
    };
    void loadRole();
  }, []);

  const handleSwipeLockChange = useCallback((locked: boolean) => {
    setSwipeEnabled(!locked);
  }, []);

  const renderScene = useCallback(
    ({ route }: { route: { key: string } }) => {
      if (route.key === "immeubles") {
        return (
          <ImmeublesScreen
            isActive={index === 1}
            onSwipeLockChange={handleSwipeLockChange}
            onHamburgerVisibilityChange={onRailVisibilityChange}
            onHeaderVisibilityChange={onHeaderVisibilityChange}
            autoSelectImmeubleId={autoSelectImmeubleId}
            onAutoSelectConsumed={handleAutoSelectConsumed}
          />
        );
      }
      if (route.key === "historique") {
        return <HistoriqueScreen />;
      }
      if (route.key === "equipe") {
        return <EquipeScreen />;
      }
      if (route.key === "agenda") {
        return <AgendaScreen onNavigateToImmeuble={handleNavigateToImmeuble} />;
      }
      if (route.key === "statistiques") {
        return <StatistiquesScreen onNavigateToImmeuble={handleNavigateToImmeuble} />;
      }
      return <DashboardScreen />;
    },
    [autoSelectImmeubleId, handleAutoSelectConsumed, handleNavigateToImmeuble, handleSwipeLockChange, index, onHeaderVisibilityChange, onRailVisibilityChange],
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes: tabRoutes }}
        renderScene={renderScene}
        onIndexChange={onIndexChange}
        renderTabBar={() => null}
        swipeEnabled={swipeEnabled}
        lazy
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
