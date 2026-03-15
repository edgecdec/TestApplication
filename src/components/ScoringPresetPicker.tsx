"use client";

import { SCORING_PRESETS } from "@/lib/bracket-constants";
import type { ScoringSettings } from "@/types/group";

interface Props {
  onSelect: (scoring: ScoringSettings) => void;
}

export default function ScoringPresetPicker({ onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">Scoring Preset</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SCORING_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect({ ...p.scoring, pointsPerRound: [...p.scoring.pointsPerRound], upsetBonusPerRound: [...p.scoring.upsetBonusPerRound] })}
            className="border rounded-lg p-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 transition text-sm"
          >
            <span className="font-semibold">{p.emoji} {p.name}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
