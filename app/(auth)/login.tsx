import { authService } from "@/services/auth";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email et mot de passe requis.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.login({ username: email.trim(), password });
      router.replace("/(app)");
    } catch (err: any) {
      if (err?.message === "UNAUTHORIZED_GROUP") {
        setError("Groupe non autorise.");
      } else if (err?.graphQLErrors?.length) {
        setError(err.graphQLErrors[0]?.message || "Connexion impossible.");
      } else if (err?.message) {
        setError(`Erreur reseau: ${err}`);
      } else {
        setError("Connexion impossible. Verifie tes identifiants.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Feather name="user" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Pro-Win</Text>
            <Text style={styles.subtitle}>Module prospection</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email ou nom d&apos;utilisateur</Text>
              <View style={styles.inputRow}>
                <Feather name="mail" size={18} color="#94A3B8" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email ou nom d'utilisateur"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.passwordRow}>
                <Text style={styles.label}>Mot de passe</Text>
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading}
                >
                  <Text style={styles.toggleText}>
                    {showPassword ? "Masquer" : "Afficher"}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.inputRow}>
                <Feather name="lock" size={18} color="#94A3B8" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mot de passe"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  autoCorrect={false}
                  style={styles.input}
                  editable={!isLoading}
                />
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.button,
                pressed && !isLoading ? styles.buttonPressed : null,
                isLoading ? styles.buttonDisabled : null,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Se connecter</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  error: {
    marginBottom: 12,
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
  },
  info: {
    marginBottom: 12,
    color: "#0F172A",
    backgroundColor: "#E0F2FE",
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    color: "#0F172A",
    marginBottom: 6,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },
  button: {
    marginTop: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
});
