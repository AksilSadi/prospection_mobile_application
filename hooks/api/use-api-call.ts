import { useCallback, useEffect, useRef, useState } from "react";

export type UseApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

type ApiInternalState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type ApiCacheEntry = {
  data: unknown;
  expiresAt: number;
};

type CacheSubscriber = () => void;

export type UseApiCallOptions = {
  cacheKey?: string;
  cacheTimeMs?: number;
};

const DEFAULT_CACHE_TTL_MS = 30_000;
const apiCache = new Map<string, ApiCacheEntry>();
const cacheSubscribers = new Map<string, Set<CacheSubscriber>>();

function subscribeCacheKey(cacheKey: string, subscriber: CacheSubscriber): () => void {
  const listeners = cacheSubscribers.get(cacheKey) ?? new Set<CacheSubscriber>();
  listeners.add(subscriber);
  cacheSubscribers.set(cacheKey, listeners);

  return () => {
    const current = cacheSubscribers.get(cacheKey);
    if (!current) return;
    current.delete(subscriber);
    if (current.size === 0) {
      cacheSubscribers.delete(cacheKey);
    }
  };
}

function notifyCacheInvalidated(cacheKey: string): void {
  const listeners = cacheSubscribers.get(cacheKey);
  if (!listeners || listeners.size === 0) return;
  listeners.forEach((listener) => {
    listener();
  });
}

export function invalidateApiCache(cacheKey: string): void {
  apiCache.delete(cacheKey);
  notifyCacheInvalidated(cacheKey);
}

export function invalidateApiCacheByPrefix(prefix: string): void {
  const keys = new Set<string>();
  apiCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      keys.add(key);
    }
  });
  cacheSubscribers.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      keys.add(key);
    }
  });
  keys.forEach((key) => {
    invalidateApiCache(key);
  });
}

function readCache<T>(cacheKey?: string): T | null {
  if (!cacheKey) return null;
  const entry = apiCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(cacheKey);
    return null;
  }
  return entry.data as T;
}

function writeCache<T>(cacheKey: string, data: T, cacheTimeMs: number): void {
  apiCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + cacheTimeMs,
  });
}

function stringifyDep(value: unknown): string {
  if (value === null) return "null";
  const valueType = typeof value;
  if (valueType === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

export function useApiCall<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  options?: UseApiCallOptions,
): UseApiState<T> {
  const cacheKey = options?.cacheKey;
  const cacheTimeMs = options?.cacheTimeMs ?? DEFAULT_CACHE_TTL_MS;
  const cachedData = readCache<T>(cacheKey);
  const depsHash = deps.map(stringifyDep).join("|");

  const [state, setState] = useState<ApiInternalState<T>>({
    data: cachedData,
    loading: cachedData === null,
    error: null,
  });
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (forceRefresh = false) => {
    void depsHash;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!forceRefresh) {
      const cacheValue = readCache<T>(cacheKey);
      if (cacheValue !== null) {
        setState({
          data: cacheValue,
          loading: false,
          error: null,
        });
        return;
      }
    }

    setState((prev) => {
      if (prev.loading && prev.error === null) {
        return prev;
      }
      return {
        ...prev,
        loading: true,
        error: null,
      };
    });

    try {
      const result = await fn();
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      if (cacheKey) {
        writeCache(cacheKey, result, cacheTimeMs);
      }
      setState({
        data: result,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setState((prev) => ({
        data: prev.data,
        loading: false,
        error: message,
      }));
    }
  }, [cacheKey, cacheTimeMs, depsHash, fn]);

  useEffect(() => {
    void run();
  }, [run]);

  useEffect(() => {
    if (!cacheKey) return;
    return subscribeCacheKey(cacheKey, () => {
      void run(true);
    });
  }, [cacheKey, run]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: () => run(true),
  };
}
