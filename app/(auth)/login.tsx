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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { width, height } = useWindowDimensions();

  const verticalSpacing = height * 0.04;
  const cardPadding = Math.min(30, width * 0.08);

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
        setError("Compte non autorise (commercial ou manager uniquement).");
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
      <View style={[styles.backgroundShape, { height: height * 0.4 }]} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: height - 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={[styles.header, { marginBottom: verticalSpacing }]}>
              <View style={styles.iconCircle}>
                <Feather name="shield" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>Pro-Win</Text>
              <Text style={styles.tagline}>Module Prospection</Text>
            </View>

            <View style={[styles.card, { padding: cardPadding }]}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSubtitle}>Accédez à votre espace</Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Feather name="alert-triangle" size={18} color="#D32F2F" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={[styles.form, { gap: verticalSpacing * 0.5 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Identifiant</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="user"
                      size={20}
                      color="#64748B"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email ou nom d'utilisateur"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      style={styles.input}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mot de passe</Text>
                  <View style={styles.inputWrapper}>
                    <Feather
                      name="lock"
                      size={20}
                      color="#64748B"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="password"
                      autoCorrect={false}
                      style={styles.input}
                      editable={!isLoading}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      hitSlop={10}
                    >
                      <Feather
                        name={showPassword ? "eye-off" : "eye"}
                        size={20}
                        color="#0047AB"
                      />
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.loginButtonPressed,
                    isLoading && styles.loginButtonDisabled,
                    { marginTop: verticalSpacing * 0.5 }
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={[styles.footer, { marginTop: verticalSpacing }]}>
              <Text style={styles.footerText}>
                Besoin d'aide ? Contactez votre administrateur.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  backgroundShape: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0047AB",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  centerContainer: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: "#E0E7FF",
    marginTop: 4,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  form: {
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    height: 52,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: "#0047AB",
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0047AB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.7,
    backgroundColor: "#94A3B8",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 13,
  },
});
