import SwipeTabs from "@/components/navigation/SwipeTabs";
import ProfileMenuOverlay from "@/components/ProfileMenuOverlay";
import { ProfileMenuProvider, useProfileMenu } from "@/hooks/use-profile-menu";
import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function Header() {
  const { open } = useProfileMenu();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerSafe, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.headerTitle}>Pro-Win</Text>
      <Feather name="user" size={20} color="#1F2937" onPress={open} />
    </View>
  );
}

function AppContent() {
  const [index, setIndex] = useState(0);
  const routes = useMemo(() => ["dashboard", "immeubles", "historique"], []);

  return (
    <>
      <Header />
      <SwipeTabs index={index} onIndexChange={setIndex} />
      <ProfileMenuOverlay />
    </>
  );
}

export default function AppIndex() {
  return (
    <ProfileMenuProvider>
      <View style={styles.container}>
        <AppContent />
      </View>
    </ProfileMenuProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerSafe: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
});
