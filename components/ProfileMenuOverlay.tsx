import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authService } from "@/services/auth";
import { useProfileMenu } from "@/hooks/use-profile-menu";

export default function ProfileMenuOverlay() {
  const router = useRouter();
  const { isVisible, close } = useProfileMenu();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await authService.logout();
    close();
    router.replace("/(auth)/login");
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.dim} pointerEvents="none" />
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.panel, { top: insets.top + 52 }]}>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Deconnexion</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: "absolute",
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    minWidth: 160,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
