import { useEffect, useRef } from "react";

type UseTimeoutOptions = {
  autoStart?: boolean;
};

export function useTimeout(callback: () => void, delay: number, options: UseTimeoutOptions) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!options.autoStart) return undefined;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay, options.autoStart]);
}
