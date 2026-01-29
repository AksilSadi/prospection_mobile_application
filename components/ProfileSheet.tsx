import { useWorkspaceProfile } from "@/hooks/api/use-workspace-profile";
import { authService } from "@/services/auth";
import type { Commercial, Manager } from "@/types/api";
import { Feather } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";

type ProfileSheetProps = {
  userId: number | null;
  role: string | null;
};

const ProfileSheet = forwardRef<BottomSheet, ProfileSheetProps>(
  ({ userId, role }, ref) => {
    const router = useRouter();
    const { data: profile, loading } = useWorkspaceProfile(userId, role);
    const [initials, setInitials] = useState("");

    const snapPoints = useMemo(() => ["50%"], []);

    useEffect(() => {
      if (profile) {
        const nom = profile.nom || "";
        const prenom = profile.prenom || "";
        setInitials(`${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase());
      }
    }, [profile]);

    const handleLogout = async () => {
      await authService.clearTokens();
      router.replace("/(auth)/login");
    };

    if (loading || !profile) {
      return (
        <BottomSheet ref={ref} snapPoints={snapPoints} enablePanDownToClose index={-1}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        </BottomSheet>
      );
    }

    const email = (profile as Commercial).email || (profile as Manager).email || "Non renseigné";
    const phone = (profile as Commercial).numTel || (profile as Manager).numTelephone || "Non renseigné";
    const roleLabel = role === "manager" ? "Manager" : "Commercial";

    return (
      <BottomSheet ref={ref} snapPoints={snapPoints} enablePanDownToClose index={-1}>
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.fullName}>
              {profile.prenom} {profile.nom}
            </Text>
            <View style={styles.roleBadge}>
              <Feather name={role === "manager" ? "briefcase" : "user"} size={12} color="#2563EB" />
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Feather name="mail" size={18} color="#64748B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Feather name="phone" size={18} color="#64748B" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text style={styles.infoValue}>{phone}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

ProfileSheet.displayName = "ProfileSheet";

export default ProfileSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  header: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EFF6FF",
    borderWidth: 3,
    borderColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2563EB",
  },
  fullName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});
