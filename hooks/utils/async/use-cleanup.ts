import { useCallback, useRef } from "react";

type CleanupItem = {
  key: string;
  fn: () => Promise<void> | void;
};

export function useCleanup() {
  const itemsRef = useRef<CleanupItem[]>([]);

  const addCleanup = useCallback((fn: CleanupItem["fn"], key: string) => {
    itemsRef.current.push({ key, fn });
  }, []);

  const cleanupAll = useCallback(async () => {
    const items = [...itemsRef.current].reverse();
    itemsRef.current = [];
    for (const item of items) {
      await item.fn();
    }
  }, []);

  return { addCleanup, cleanupAll };
}
