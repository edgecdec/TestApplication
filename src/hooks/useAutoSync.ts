import { useEffect, useRef } from "react";

/**
 * Triggers a background ESPN auto-sync on mount.
 * Fire-and-forget — errors are silently ignored.
 * The server debounces at 60s so calling this from multiple pages is safe.
 */
export function useAutoSync() {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch("/api/espn/auto-sync", { method: "POST" }).catch(() => {});
  }, []);
}
