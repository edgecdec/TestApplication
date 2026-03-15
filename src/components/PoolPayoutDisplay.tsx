"use client";

import { calculatePayouts, parsePayoutStructure } from "@/lib/payouts";

interface Props {
  buyIn: number;
  payoutStructure: string;
  memberCount: number;
}

export default function PoolPayoutDisplay({ buyIn, payoutStructure, memberCount }: Props) {
  if (!buyIn || buyIn <= 0) return null;

  const structure = parsePayoutStructure(payoutStructure);
  const payouts = calculatePayouts(buyIn, memberCount, structure);
  const pool = buyIn * memberCount;

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-green-800 dark:text-green-200">
          💰 Prize Pool: ${pool.toFixed(0)} ({memberCount} × ${buyIn})
        </span>
      </div>
      <div className="flex gap-3 flex-wrap">
        {payouts.map((p) => (
          <span key={p.place} className={`text-xs px-2 py-1 rounded ${p.place === 1 ? "bg-yellow-100 text-yellow-800 font-bold" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
            {p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : p.place === 3 ? "🥉" : `${p.place}th`} ${p.amount.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}
