import { authService } from "@/services/auth";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  const [targetRoute, setTargetRoute] = useState<"/(app)" | "/(auth)/login" | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    const resolveRoute = async () => {
      const hasSession = await authService.initializeAuth();

      if (!isMounted) return;
      setTargetRoute(hasSession ? "/(app)" : "/(auth)/login");
    };

    void resolveRoute();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!targetRoute) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  return <Redirect href={targetRoute} />;
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
