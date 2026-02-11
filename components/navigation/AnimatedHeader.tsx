import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { useProfileSheet } from "@/hooks/use-profile-sheet";
import { authService } from "@/services/auth";
import type { Commercial, Manager } from "@/types/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AnimatedHeaderProps = {
  currentIndex: number;
};

const BASE_TITLES = ["Dashboard", "Immeubles", "Agenda", "Statistiques", "Historique"];
const MANAGER_TITLES = [
  "Dashboard",
  "Immeubles",
  "Agenda",
  "Statistiques",
  "Équipe",
  "Historique",
];

export default function AnimatedHeader({ currentIndex }: AnimatedHeaderProps) {
  const { open } = useProfileSheet();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { data: profile } = useWorkspaceProfile(userId, role);

  const titles = useMemo(
    () => (role === "manager" ? MANAGER_TITLES : BASE_TITLES),
    [role],
  );

  const fadeAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const translateAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
    new Animated.Value(20),
  ]).current;

  useEffect(() => {
    const loadIdentity = async () => {
      const id = await authService.getUserId();
      const userRole = await authService.getUserRole();
      setUserId(id);
      setRole(userRole);
    };
    void loadIdentity();
  }, []);

  useEffect(() => {
    const animations = fadeAnims.flatMap((_, index) => {
      const isActive = index === currentIndex && index < titles.length;

      return [
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
      ];
    });

    Animated.parallel(animations).start();
  }, [currentIndex, fadeAnims, titles, translateAnims]);

  const initials = useMemo(() => {
    if (!profile) {
      return "?";
    }

    const nom = (profile as Commercial).nom || (profile as Manager).nom || "";
    const prenom =
      (profile as Commercial).prenom || (profile as Manager).prenom || "";
    const computed = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    return computed || "?";
  }, [profile]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          {titles.map((title, index) => (
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
            <Text style={styles.profileInitials}>{initials}</Text>
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
    elevation: 0,
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
  profileInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
});
