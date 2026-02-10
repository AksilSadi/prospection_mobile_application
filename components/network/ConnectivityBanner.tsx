import { useConnectivity } from "@/hooks/network/use-connectivity";
import { useOfflineQueueCount } from "@/hooks/network/use-offline-queue";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ConnectivityBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const { pendingCount } = useOfflineQueueCount();

  const showOffline = !isOnline;
  const showPending = isOnline && pendingCount > 0;

  if (!showOffline && !showPending) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        { top: insets.top + 8 },
        showOffline ? styles.containerOffline : styles.containerSync,
      ]}
    >
      <Text style={styles.title}>{showOffline ? "Mode hors ligne" : "Synchronisation"}</Text>
      <Text style={styles.subtitle}>
        {showOffline
          ? "Activez le Wi-Fi ou les donnees mobiles pour envoyer les actions en attente."
          : `${pendingCount} action${pendingCount > 1 ? "s" : ""} en attente d'envoi.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 30,
    borderWidth: 1,
  },
  containerOffline: {
    backgroundColor: "#7F1D1D",
    borderColor: "#FCA5A5",
  },
  containerSync: {
    backgroundColor: "#1D4ED8",
    borderColor: "#93C5FD",
  },
  title: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: "#E2E8F0",
  },
});
