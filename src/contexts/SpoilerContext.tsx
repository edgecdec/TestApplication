"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "spoiler-free-mode";

interface SpoilerContextValue {
  spoilerFree: boolean;
  toggleSpoilerFree: () => void;
}

const SpoilerContext = createContext<SpoilerContextValue>({
  spoilerFree: false,
  toggleSpoilerFree: () => {},
});

export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [spoilerFree, setSpoilerFree] = useState(false);

  useEffect(() => {
    try { setSpoilerFree(localStorage.getItem(STORAGE_KEY) === "true"); } catch {}
  }, []);

  const toggleSpoilerFree = useCallback(() => {
    setSpoilerFree((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <SpoilerContext.Provider value={{ spoilerFree, toggleSpoilerFree }}>
      {children}
    </SpoilerContext.Provider>
  );
}

export function useSpoilerFree(): SpoilerContextValue {
  return useContext(SpoilerContext);
}
