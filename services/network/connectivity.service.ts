import NetInfo from "@react-native-community/netinfo";

type ConnectivityListener = (isOnline: boolean) => void;

let isOnline = false;
let isInitialized = false;
let isConnectivityReady = false;
const listeners = new Set<ConnectivityListener>();

function notify(nextIsOnline: boolean): void {
  listeners.forEach((listener) => {
    listener(nextIsOnline);
  });
}

function handleStateChange(nextIsOnline: boolean): void {
  const wasReady = isConnectivityReady;
  const hasChanged = nextIsOnline !== isOnline;
  isOnline = nextIsOnline;
  isConnectivityReady = true;
  if (!wasReady || hasChanged) {
    notify(nextIsOnline);
  }
}

export function ensureConnectivityMonitoring(): void {
  if (isInitialized) return;
  isInitialized = true;

  void NetInfo.fetch().then((state) => {
    const next = Boolean(state.isConnected) && state.isInternetReachable !== false;
    handleStateChange(next);
  });

  NetInfo.addEventListener((state) => {
    const next = Boolean(state.isConnected) && state.isInternetReachable !== false;
    handleStateChange(next);
  });
}

export function subscribeConnectivity(listener: ConnectivityListener): () => void {
  listeners.add(listener);
  listener(getIsOnline());
  return () => {
    listeners.delete(listener);
  };
}

export function getIsOnline(): boolean {
  return isConnectivityReady ? isOnline : false;
}

export function isConnectivityInitialized(): boolean {
  return isConnectivityReady;
}
