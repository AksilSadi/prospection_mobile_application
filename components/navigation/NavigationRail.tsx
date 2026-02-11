import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const NavItem = memo(function NavItem({
  icon,
  label,
  isActive,
  onPress,
}: NavItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={styles.navItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[styles.navIconPill, isActive && styles.navIconPillActive]}
        >
          <Feather
            name={icon}
            size={20}
            color={isActive ? "#2563EB" : "#64748B"}
          />
        </View>
        <Text
          style={[styles.navLabel, isActive && styles.navLabelActive]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

type NavigationRailProps = {
  currentIndex: number;
  onNavigate: (index: number) => void;
};

export default function NavigationRail({
  currentIndex,
  onNavigate,
}: NavigationRailProps) {
  const insets = useSafeAreaInsets();
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      const role = await authService.getUserRole();
      setIsManager(role === "manager");
    };
    void loadRole();
  }, []);

  const navItems = useMemo(
    () => [
      {
        key: "dashboard",
        icon: "bar-chart-2" as keyof typeof Feather.glyphMap,
        label: "Tableau",
        targetIndex: 0,
      },
      {
        key: "immeubles",
        icon: "home" as keyof typeof Feather.glyphMap,
        label: "Immeubles",
        targetIndex: 1,
      },
      {
        key: "agenda",
        icon: "book-open" as keyof typeof Feather.glyphMap,
        label: "Agenda",
        targetIndex: 2,
      },
      {
        key: "stats",
        icon: "trending-up" as keyof typeof Feather.glyphMap,
        label: "Stats",
        targetIndex: 3,
      },
      ...(isManager
        ? [
            {
              key: "equipe",
              icon: "users" as keyof typeof Feather.glyphMap,
              label: "Équipe",
              targetIndex: 4,
            },
          ]
        : []),
      {
        key: "historique",
        icon: "clock" as keyof typeof Feather.glyphMap,
        label: "Historique",
        targetIndex: isManager ? 5 : 4,
      },
    ],
    [isManager],
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <View style={styles.logoSection}>
        <View style={styles.logo}>
          <Feather name="shield" size={22} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.navSection}>
        {navItems.map((item) => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            isActive={currentIndex === item.targetIndex}
            onPress={() => onNavigate(item.targetIndex)}
          />
        ))}
      </View>

      <Text style={styles.version}>v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navSection: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    paddingVertical: 8,
    borderRadius: 14,
  },
  navIconPill: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconPillActive: {
    backgroundColor: "#EFF6FF",
  },
  navLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  navLabelActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  version: {
    fontSize: 10,
    color: "#94A3B8",
  },
});
