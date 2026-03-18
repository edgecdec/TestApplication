"use client";

import { useSpoilerFree } from "@/contexts/SpoilerContext";

export default function SpoilerToggle() {
  const { spoilerFree, toggleSpoilerFree } = useSpoilerFree();
  return (
    <button
      onClick={toggleSpoilerFree}
      className={`p-1 rounded transition text-sm ${
        spoilerFree
          ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
          : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      }`}
      title={spoilerFree ? "Spoiler-free mode ON — click to show results" : "Hide spoilers"}
      aria-label="Toggle spoiler-free mode"
    >
      {spoilerFree ? "🙈" : "👁️"}
    </button>
  );
}
