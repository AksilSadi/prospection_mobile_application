import '../tamagui-web.css'
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { registerGlobals } from "@livekit/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "tamagui";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { tamaguiConfig } from "../tamagui.config";

registerGlobals();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="light" translucent backgroundColor="transparent" />
        </BottomSheetModalProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
