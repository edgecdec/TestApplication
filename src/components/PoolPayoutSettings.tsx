"use client";

import { PAYOUT_PRESETS } from "@/lib/payouts";
import type { PayoutStructure } from "@/types/group";

interface Props {
  buyIn: number;
  setBuyIn: (v: number) => void;
  payout: PayoutStructure;
  setPayout: (v: PayoutStructure) => void;
  memberCount: number;
  disabled?: boolean;
}

export default function PoolPayoutSettings({ buyIn, setBuyIn, payout, setPayout, memberCount, disabled }: Props) {
  const pool = buyIn * memberCount;

  function applyPreset(places: number[]) {
    setPayout({ places: [...places] });
  }

  function updatePlace(index: number, value: number) {
    const next = [...payout.places];
    next[index] = value;
    setPayout({ places: next });
  }

  function addPlace() {
    setPayout({ places: [...payout.places, 0] });
  }

  function removePlace(index: number) {
    if (payout.places.length <= 1) return;
    setPayout({ places: payout.places.filter((_, i) => i !== index) });
  }

  const totalPct = payout.places.reduce((s, p) => s + p, 0);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium mb-1">💰 Buy-In Amount ($)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={buyIn}
          onChange={(e) => setBuyIn(Math.max(0, Number(e.target.value)))}
          disabled={disabled}
          className="w-32 border rounded px-3 py-2 text-sm disabled:opacity-50"
          placeholder="0"
        />
        {buyIn > 0 && (
          <span className="ml-3 text-sm text-gray-500">
            Pool: ${pool.toFixed(0)} ({memberCount} member{memberCount !== 1 ? "s" : ""})
          </span>
        )}
      </div>

      {buyIn > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Payout Structure</label>
            <div className="flex gap-1 flex-wrap mb-2">
              {PAYOUT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.places)}
                  disabled={disabled}
                  className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {payout.places.map((pct, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-8">{i + 1}{i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) => updatePlace(i, Math.max(0, Number(e.target.value)))}
                    disabled={disabled}
                    className="w-20 border rounded px-2 py-1 text-sm disabled:opacity-50"
                  />
                  <span className="text-xs text-gray-500">%</span>
                  {pool > 0 && <span className="text-xs text-green-700 font-medium">${(pool * pct / 100).toFixed(2)}</span>}
                  {payout.places.length > 1 && !disabled && (
                    <button type="button" onClick={() => removePlace(i)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                  )}
                </div>
              ))}
            </div>
            {!disabled && (
              <button type="button" onClick={addPlace} className="mt-1 text-xs text-blue-600 hover:underline">+ Add place</button>
            )}
            {totalPct !== 100 && (
              <p className="text-xs text-red-500 mt-1">Percentages sum to {totalPct}% (should be 100%)</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
