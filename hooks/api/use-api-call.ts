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

export type UseApiCallOptions = {
  cacheKey?: string;
  cacheTimeMs?: number;
};

const DEFAULT_CACHE_TTL_MS = 30_000;
const apiCache = new Map<string, ApiCacheEntry>();

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

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: () => run(true),
  };
}
