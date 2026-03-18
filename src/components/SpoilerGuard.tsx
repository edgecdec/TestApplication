"use client";

import type { ReactNode } from "react";
import { useSpoilerFree } from "@/contexts/SpoilerContext";

const PLACEHOLDER_TEXT = "🙈 Hidden — Spoiler-free mode is on";

/** Wraps children and replaces them with a placeholder when spoiler-free mode is active. */
export default function SpoilerGuard({ children, label }: { children: ReactNode; label?: string }) {
  const { spoilerFree } = useSpoilerFree();
  if (!spoilerFree) return <>{children}</>;
  return (
    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-4 text-center text-sm text-gray-400 dark:text-gray-500">
      {label || PLACEHOLDER_TEXT}
    </div>
  );
}
