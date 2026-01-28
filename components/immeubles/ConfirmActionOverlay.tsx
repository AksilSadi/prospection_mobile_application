import { Feather } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
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
  const translateY = useRef(new Animated.Value(24)).current;
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const isDanger = tone === "danger";

  useEffect(() => {
    if (!open) return;
    opacity.setValue(0);
    translateY.setValue(24);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, translateY]);

  return (
    <Modal visible={open} transparent animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            isTablet && styles.sheetTablet,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={[styles.heroIcon, isDanger && styles.heroIconDanger]}>
            <View
              style={[styles.heroIconInner, isDanger && styles.heroIconInnerDanger]}
            >
              <Feather
                name={isDanger ? "trash-2" : "check-circle"}
                size={22}
                color={isDanger ? "#DC2626" : "#16A34A"}
              />
            </View>
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
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
    padding: 18,
  },
  sheet: {
    width: "100%",
    borderRadius: 26,
    padding: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetTablet: {
    width: 520,
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginBottom: 8,
  },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroIconDanger: {
    backgroundColor: "#FEE2E2",
  },
  heroIconInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconInnerDanger: {
    backgroundColor: "#FFFFFF",
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
