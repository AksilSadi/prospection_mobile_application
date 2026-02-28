import { Platform } from "react-native";
import BackgroundService from "react-native-background-actions";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BACKGROUND_OPTIONS = {
  taskName: "ProWinAudio",
  taskTitle: "ProWin audio actif",
  taskDesc: "Ecoute en cours en arriere-plan",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#000000",
  linkingURI: "prospection://",
  parameters: {
    delay: 30000,
  },
};

async function backgroundKeepAlive(taskDataArguments?: { delay: number }) {
  const delay = taskDataArguments?.delay ?? 30000;
  while (BackgroundService.isRunning()) {
    await sleep(delay);
  }
}

export class BackgroundAudioService {
  static isSupported(): boolean {
    return Platform.OS === "android";
  }

  static isRunning(): boolean {
    if (!this.isSupported()) {
      return false;
    }
    return BackgroundService.isRunning();
  }

  static async start(): Promise<void> {
    if (!this.isSupported() || this.isRunning()) {
      return;
    }
    await BackgroundService.start(backgroundKeepAlive, BACKGROUND_OPTIONS);
  }

  static async stop(): Promise<void> {
    if (!this.isSupported() || !this.isRunning()) {
      return;
    }
    await BackgroundService.stop();
  }
}
