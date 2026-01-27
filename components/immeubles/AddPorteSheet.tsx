import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type AddPortePayload = {
  etage: number;
  numero: string;
  nomPersonnalise?: string;
};

type AddPorteSheetProps = {
  open: boolean;
  defaultEtage?: number;
  defaultNumero?: string;
  onClose: () => void;
  onSubmit: (payload: AddPortePayload) => void;
};

export default function AddPorteSheet({
  open,
  defaultEtage = 1,
  defaultNumero = "",
  onClose,
  onSubmit,
}: AddPorteSheetProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const sheetRef = useRef<BottomSheetModal>(null);
  const [errors, setErrors] = useState<{ etage?: string; numero?: string }>({});
  const [form, setForm] = useState({
    etage: String(defaultEtage),
    numero: defaultNumero,
    nomPersonnalise: "",
  });

  const snapPoints = useMemo(
    () => (isTablet ? ["55%", "75%"] : ["60%", "82%"]),
    [isTablet],
  );

  const sheetContainerStyle = isTablet
    ? { alignSelf: "center" as const, width: Math.min(width * 0.9, 720) }
    : undefined;

  useEffect(() => {
    if (open) {
      setForm({
        etage: String(defaultEtage),
        numero: defaultNumero,
        nomPersonnalise: "",
      });
      setErrors({});
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [open, defaultEtage, defaultNumero]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.45}
      />
    ),
    [],
  );

  const close = () => {
    sheetRef.current?.dismiss();
  };

  const handleDismiss = () => {
    onClose();
  };

  const handleChange = (field: "etage" | "numero" | "nomPersonnalise", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors: { etage?: string; numero?: string } = {};
    const etageValue = Number(form.etage);
    if (!form.etage || Number.isNaN(etageValue) || etageValue < 1) {
      nextErrors.etage = "Etage invalide";
    }
    if (!form.numero.trim()) {
      nextErrors.numero = "Numero requis";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSubmit({
      etage: Number(form.etage),
      numero: form.numero.trim(),
      nomPersonnalise: form.nomPersonnalise.trim() || undefined,
    });
    close();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={1}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onDismiss={handleDismiss}
      detached={isTablet}
      bottomInset={insets.bottom + 12}
      style={sheetContainerStyle}
      backgroundStyle={[
        styles.sheetBackground,
        isTablet && { borderRadius: 28 },
      ]}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={[styles.sheet, isTablet && styles.sheetTablet]}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Feather name="plus-circle" size={18} color="#2563EB" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Ajouter une porte</Text>
            <Text style={styles.subtitle}>
              Renseigne l'etage et le numero
            </Text>
          </View>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Etage</Text>
            <View style={[styles.inputRow, errors.etage && styles.inputError]}>
              <Feather name="layers" size={16} color="#64748B" />
              <TextInput
                placeholder="Ex: 2"
                keyboardType="number-pad"
                value={form.etage}
                onChangeText={(value) => handleChange("etage", value)}
                style={styles.inputInline}
              />
            </View>
            {errors.etage ? (
              <Text style={styles.error}>{errors.etage}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Numero de porte</Text>
            <View style={[styles.inputRow, errors.numero && styles.inputError]}>
              <Feather name="hash" size={16} color="#64748B" />
              <TextInput
                placeholder="Ex: 3"
                value={form.numero}
                onChangeText={(value) => handleChange("numero", value)}
                style={styles.inputInline}
              />
            </View>
            {errors.numero ? (
              <Text style={styles.error}>{errors.numero}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nom personnalise (optionnel)</Text>
            <View style={styles.inputRow}>
              <Feather name="edit-3" size={16} color="#64748B" />
              <TextInput
                placeholder="Ex: Mme Martin"
                value={form.nomPersonnalise}
                onChangeText={(value) => handleChange("nomPersonnalise", value)}
                style={styles.inputInline}
              />
            </View>
          </View>
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.ghostButton} onPress={close}>
            <Text style={styles.ghostText}>Annuler</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={submit}>
            <Text style={styles.primaryText}>Ajouter</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5F5",
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
  },
  sheetTablet: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  content: {
    paddingVertical: 8,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  inputInline: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  inputError: {
    borderColor: "#FCA5A5",
  },
  error: {
    fontSize: 11,
    color: "#EF4444",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
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
  primaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
