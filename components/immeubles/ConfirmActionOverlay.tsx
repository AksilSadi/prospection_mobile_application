import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type ConfirmActionOverlayProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmActionOverlay({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
  onClose,
}: ConfirmActionOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isDanger = tone === "danger";

  useEffect(() => {
    if (!open) return;
    opacity.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, scale]);

  return (
    <Modal visible={open} transparent animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            isTablet && styles.cardTablet,
            { opacity, transform: [{ scale }] },
          ]}
        >
          <View style={[styles.iconWrap, isDanger && styles.iconDanger]}>
            <Feather
              name={isDanger ? "alert-triangle" : "check-circle"}
              size={18}
              color={isDanger ? "#DC2626" : "#16A34A"}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.ghostButton} onPress={onClose}>
              <Text style={styles.ghostText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.primaryButton,
                isDanger && styles.primaryDanger,
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.primaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardTablet: {
    width: 520,
    padding: 22,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDanger: {
    backgroundColor: "#FEE2E2",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  actions: {
    marginTop: 6,
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  ghostButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    alignItems: "center",
  },
  ghostText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryDanger: {
    backgroundColor: "#DC2626",
  },
  primaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
