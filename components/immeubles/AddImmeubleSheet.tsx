import { useMemo, useState } from "react";
import { BlurView } from "expo-blur";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { CreateImmeubleInput } from "@/types/api";

type AddImmeubleSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CreateImmeubleInput) => Promise<void> | void;
  loading?: boolean;
  ownerId?: number | null;
  ownerRole?: string | null;
};

const STEPS = [
  { id: "address", title: "Adresse", icon: "map-pin" },
  { id: "details", title: "Details", icon: "home" },
  { id: "access", title: "Acces", icon: "key" },
];

export default function AddImmeubleSheet({
  open,
  onClose,
  onSave,
  loading = false,
  ownerId,
  ownerRole,
}: AddImmeubleSheetProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    adresse: "",
    complementAdresse: "",
    nbEtages: "",
    nbPortesParEtage: "",
    ascenseurPresent: false,
    digitalCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const totalPortes = useMemo(() => {
    const etages = Number(formData.nbEtages);
    const portes = Number(formData.nbPortesParEtage);
    if (!etages || !portes) return 0;
    return etages * portes;
  }, [formData.nbEtages, formData.nbPortesParEtage]);

  const reset = () => {
    setCurrentStep(0);
    setErrors({});
    setFormData({
      adresse: "",
      complementAdresse: "",
      nbEtages: "",
      nbPortesParEtage: "",
      ascenseurPresent: false,
      digitalCode: "",
    });
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {};
    if (step === 0 && !formData.adresse.trim()) {
      nextErrors.adresse = "Adresse requise";
    }
    if (step === 1) {
      if (!formData.nbEtages || Number(formData.nbEtages) < 1) {
        nextErrors.nbEtages = "Etages invalides";
      }
      if (!formData.nbPortesParEtage || Number(formData.nbPortesParEtage) < 1) {
        nextErrors.nbPortesParEtage = "Portes invalides";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const submit = async () => {
    if (!validateStep(currentStep)) return;

    const adresseComplete = formData.complementAdresse.trim()
      ? `${formData.adresse}, ${formData.complementAdresse.trim()}`
      : formData.adresse;

    const payload: CreateImmeubleInput = {
      adresse: adresseComplete,
      nbEtages: Number(formData.nbEtages),
      nbPortesParEtage: Number(formData.nbPortesParEtage),
      ascenseurPresent: formData.ascenseurPresent,
      digitalCode: formData.digitalCode.trim() || null,
      commercialId: ownerRole === "commercial" ? ownerId ?? undefined : undefined,
      managerId: ownerRole === "manager" ? ownerId ?? undefined : undefined,
    };

    await onSave(payload);
    close();
  };

  if (!open) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <Pressable style={styles.backdrop} onPress={close} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheet}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ajouter un immeuble</Text>
            <Text style={styles.subtitle}>{STEPS[currentStep].title}</Text>
          </View>
          <Pressable style={styles.close} onPress={close}>
            <Feather name="x" size={18} color="#64748B" />
          </Pressable>
        </View>

        <View style={styles.stepRow}>
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isDone = index < currentStep;
            return (
              <View key={step.id} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isActive && styles.stepCircleActive,
                    isDone && styles.stepCircleDone,
                  ]}
                >
                  <Feather
                    name={step.icon}
                    size={14}
                    color={isActive || isDone ? "#FFFFFF" : "#94A3B8"}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isDone && styles.stepLabelDone,
                  ]}
                >
                  {step.title}
                </Text>
                {index < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {currentStep === 0 && (
            <>
              <Text style={styles.label}>Adresse de l'immeuble</Text>
              <TextInput
                placeholder="Ex: 12 rue ..."
                style={[styles.input, errors.adresse && styles.inputError]}
                value={formData.adresse}
                onChangeText={value => handleChange("adresse", value)}
              />
              {errors.adresse ? <Text style={styles.error}>{errors.adresse}</Text> : null}

              <Text style={[styles.label, styles.labelSpacing]}>Complement (optionnel)</Text>
              <TextInput
                placeholder="Appartement, batiment..."
                style={styles.input}
                value={formData.complementAdresse}
                onChangeText={value => handleChange("complementAdresse", value)}
              />
            </>
          )}

          {currentStep === 1 && (
            <>
              <View style={styles.row}>
                <View style={styles.field}>
                  <Text style={styles.label}>Etages</Text>
                  <TextInput
                    keyboardType="number-pad"
                    placeholder="Ex: 5"
                    style={[styles.input, errors.nbEtages && styles.inputError]}
                    value={formData.nbEtages}
                    onChangeText={value => handleChange("nbEtages", value)}
                  />
                  {errors.nbEtages ? <Text style={styles.error}>{errors.nbEtages}</Text> : null}
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Portes/etage</Text>
                  <TextInput
                    keyboardType="number-pad"
                    placeholder="Ex: 4"
                    style={[styles.input, errors.nbPortesParEtage && styles.inputError]}
                    value={formData.nbPortesParEtage}
                    onChangeText={value => handleChange("nbPortesParEtage", value)}
                  />
                  {errors.nbPortesParEtage ? (
                    <Text style={styles.error}>{errors.nbPortesParEtage}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total estime</Text>
                <Text style={styles.summaryValue}>
                  {totalPortes} portes
                </Text>
              </View>
            </>
          )}

          {currentStep === 2 && (
            <>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.label}>Ascenseur</Text>
                  <Text style={styles.helper}>Presence d'un ascenseur</Text>
                </View>
                <Switch
                  value={formData.ascenseurPresent}
                  onValueChange={value => handleChange("ascenseurPresent", value)}
                />
              </View>

              <Text style={[styles.label, styles.labelSpacing]}>Code digital</Text>
              <TextInput
                placeholder="Ex: 1234A"
                style={styles.input}
                value={formData.digitalCode}
                onChangeText={value => handleChange("digitalCode", value)}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.ghostButton} onPress={currentStep === 0 ? close : prevStep}>
            <Text style={styles.ghostText}>{currentStep === 0 ? "Annuler" : "Retour"}</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, loading && styles.primaryDisabled]}
            onPress={currentStep === STEPS.length - 1 ? submit : nextStep}
            disabled={loading}
          >
            <Text style={styles.primaryText}>
              {currentStep === STEPS.length - 1 ? "Creer" : "Suivant"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  stepCircleDone: {
    backgroundColor: "#60A5FA",
    borderColor: "#60A5FA",
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepLabelActive: {
    color: "#2563EB",
  },
  stepLabelDone: {
    color: "#3B82F6",
  },
  stepLine: {
    position: "absolute",
    right: -24,
    top: 17,
    width: 48,
    height: 2,
    backgroundColor: "#E2E8F0",
  },
  content: {
    paddingVertical: 16,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  labelSpacing: {
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#FCA5A5",
  },
  error: {
    color: "#EF4444",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  helper: {
    marginTop: 2,
    fontSize: 12,
    color: "#94A3B8",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
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
  primaryDisabled: {
    opacity: 0.6,
  },
  primaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
