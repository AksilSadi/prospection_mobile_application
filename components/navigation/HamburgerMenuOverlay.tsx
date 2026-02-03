import { useHamburgerMenu } from "@/hooks/use-hamburger-menu";
import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  isActive: boolean;
};

function MenuItem({ icon, label, onPress, isActive }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
        <Feather name={icon} size={22} color={isActive ? "#2563EB" : "#64748B"} />
      </View>
      <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>{label}</Text>
      {isActive && <View style={styles.activeIndicator} />}
    </Pressable>
  );
}

type HamburgerMenuOverlayProps = {
  currentIndex: number;
  onNavigate: (index: number) => void;
};

export default function HamburgerMenuOverlay({ currentIndex, onNavigate }: HamburgerMenuOverlayProps) {
  const { isVisible, close } = useHamburgerMenu();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      const role = await authService.getUserRole();
      setUserRole(role === "manager" ? "Manager" : "Commercial");
      setIsManager(role === "manager");
      // You could also fetch user name from profile here if needed
      setUserName("Pro-Win");
    };
    void loadUserInfo();
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, fadeAnim]);

  const handleNavigate = (index: number) => {
    onNavigate(index);
    close();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.dim, { opacity: fadeAnim }]} pointerEvents="none" />
      <Pressable style={styles.backdrop} onPress={close} />

      <Animated.View
        style={[
          styles.panel,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.avatar}>
              <Feather name="user" size={22} color="#2563EB" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{userName}</Text>
              <Text style={styles.headerSubtitle}>{userRole}</Text>
            </View>
          </View>
          <Pressable style={styles.closeButton} onPress={close}>
            <Feather name="x" size={20} color="#64748B" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          <MenuItem
            icon="bar-chart-2"
            label="Dashboard"
            onPress={() => handleNavigate(0)}
            isActive={currentIndex === 0}
          />
          <MenuItem
            icon="home"
            label="Immeubles"
            onPress={() => handleNavigate(1)}
            isActive={currentIndex === 1}
          />
          <MenuItem
            icon="pie-chart"
            label="Statistiques"
            onPress={() => handleNavigate(2)}
            isActive={currentIndex === 2}
          />
          {isManager ? (
            <MenuItem
              icon="users"
              label="Équipe"
              onPress={() => handleNavigate(3)}
              isActive={currentIndex === 3}
            />
          ) : null}
          <MenuItem
            icon="clock"
            label="Historique"
            onPress={() => handleNavigate(isManager ? 4 : 3)}
            isActive={currentIndex === (isManager ? 4 : 3)}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  menuSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 4,
    position: "relative",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: "#EFF6FF",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    flex: 1,
  },
  menuItemTextActive: {
    color: "#2563EB",
  },
  activeIndicator: {
    width: 4,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    position: "absolute",
    right: 0,
  },
});
