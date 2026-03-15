"use client";

import { useEffect, useState } from "react";

interface PaymentEntry {
  bracketId: number;
  bracketName: string;
  username: string;
  userId: number;
  paid: boolean;
}

interface Props {
  groupId: string;
  buyIn: number;
}

export default function PaymentTracker({ groupId, buyIn }: Props) {
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/payment`)
      .then(r => r.ok ? r.json() : { payments: [] })
      .then(d => setPayments(d.payments ?? []))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function toggle(bracketId: number, paid: boolean) {
    setToggling(bracketId);
    const res = await fetch(`/api/groups/${groupId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bracket_id: bracketId, paid }),
    });
    if (res.ok) {
      setPayments(prev => prev.map(p => p.bracketId === bracketId ? { ...p, paid } : p));
    }
    setToggling(null);
  }

  if (loading) return <p className="text-sm text-gray-400">Loading payments...</p>;
  if (payments.length === 0) return <p className="text-sm text-gray-400">No brackets in this group yet.</p>;

  const paidCount = payments.filter(p => p.paid).length;
  const total = payments.length;
  const collected = paidCount * buyIn;
  const expected = total * buyIn;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        💰 Payment Tracker — {paidCount}/{total} members paid
        {buyIn > 0 && <span className="text-gray-500 ml-1">(${collected} of ${expected} collected)</span>}
      </div>
      <div className="space-y-1">
        {payments.map(p => (
          <div key={p.bracketId} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
            <span className="text-sm">
              {p.paid ? "💰" : "⚠️"} {p.username} — {p.bracketName}
            </span>
            <button
              onClick={() => toggle(p.bracketId, !p.paid)}
              disabled={toggling === p.bracketId}
              className={`px-3 py-1 text-xs rounded transition disabled:opacity-50 ${
                p.paid
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-green-100 text-green-700 hover:bg-green-200"
              }`}
            >
              {toggling === p.bracketId ? "..." : p.paid ? "Mark Unpaid" : "Mark Paid"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
