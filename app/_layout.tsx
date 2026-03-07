import { enableOfflineQueueAutoSync } from "@/services/offline/offline-queue.service";
import { enableUploadQueueAutoSync } from "@/services/audio/recordings/upload-queue.service";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export default function RootLayout() {
  useEffect(() => {
    enableOfflineQueueAutoSync();
    void enableUploadQueueAutoSync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" translucent backgroundColor="transparent" />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
