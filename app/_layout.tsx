import ConnectivityBanner from "@/components/network/ConnectivityBanner";
import { enableOfflineQueueAutoSync } from "@/services/offline/offline-queue.service";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { registerGlobals } from "@livekit/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

registerGlobals();

export default function RootLayout() {
  useEffect(() => {
    enableOfflineQueueAutoSync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <ConnectivityBanner />
        <StatusBar style="light" translucent backgroundColor="transparent" />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
