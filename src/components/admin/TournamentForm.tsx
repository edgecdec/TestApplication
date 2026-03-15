"use client";

import { useState } from "react";

interface Props {
  onCreated: (id: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function TournamentForm({ onCreated }: Props) {
  const [name, setName] = useState(`NCAA Tournament ${CURRENT_YEAR}`);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [lockTime, setLockTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !lockTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), year, lock_time: lockTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create tournament");
      } else {
        onCreated(data.id as number);
        setName(`NCAA Tournament ${CURRENT_YEAR}`);
        setLockTime("");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Tournament Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2000}
            max={2100}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lock Time (picks deadline)</label>
          <input
            type="datetime-local"
            value={lockTime}
            onChange={(e) => setLockTime(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create Tournament"}
      </button>
    </form>
  );
}
