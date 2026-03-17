"use client";

import { useState } from "react";
import Link from "next/link";
import { TOTAL_GAMES } from "@/lib/bracket-constants";
import { countPicks } from "@/lib/pick-count";
import type { Bracket } from "@/types/tournament";

const DISMISSED_KEY = "onboarding-dismissed";

interface Props {
  brackets: Bracket[];
  hasGroups: boolean;
  hasTournaments: boolean;
}

interface Step {
  label: string;
  done: boolean;
  href: string;
}

export default function OnboardingChecklist({ brackets, hasGroups, hasTournaments }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  });

  const hasBracket = brackets.length > 0;
  const hasCompleteBracket = brackets.some((b) => countPicks(b.picks) >= TOTAL_GAMES);
  const hasTiebreaker = brackets.some((b) => b.tiebreaker != null && b.tiebreaker > 0);

  const steps: Step[] = [
    { label: "Create account", done: true, href: "#" },
    { label: "Create a bracket", done: hasBracket, href: "#create" },
    { label: `Fill out all ${TOTAL_GAMES} picks`, done: hasCompleteBracket, href: hasBracket ? `/bracket/${brackets[0].id}` : "#" },
    { label: "Set tiebreaker score", done: hasTiebreaker, href: hasBracket ? `/bracket/${brackets[0].id}` : "#" },
    { label: "Join a group", done: hasGroups, href: "/groups" },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone || !hasTournaments) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">🚀 Getting Started — {completedCount}/{steps.length}</h3>
        <button onClick={dismiss} className="text-xs text-blue-400 hover:text-blue-600 dark:hover:text-blue-200">Dismiss</button>
      </div>
      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 mb-3">
        <div className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
      </div>
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-sm">
            <span className={step.done ? "text-green-600 dark:text-green-400" : "text-gray-400"}>{step.done ? "✅" : "⬜"}</span>
            {step.done ? (
              <span className="text-gray-500 dark:text-gray-400 line-through">{step.label}</span>
            ) : (
              <Link href={step.href} className="text-blue-700 dark:text-blue-300 hover:underline">{step.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
