"use client";

import { useEffect, useState, useCallback } from "react";
import type { Prediction } from "@/types/prediction";

interface Props {
  groupId: string;
  userId: number;
  isCreator: boolean;
}

export default function GroupPropBets({ groupId, userId, isCreator }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/predictions`);
    if (res.ok) {
      const data = await res.json();
      setPredictions(data.predictions ?? []);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newQuestion.trim() || submitting) return;
    setSubmitting(true);
    await fetch(`/api/groups/${groupId}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQuestion.trim() }),
    });
    setNewQuestion("");
    setSubmitting(false);
    load();
  }

  async function handleVote(predictionId: number, vote: boolean) {
    await fetch(`/api/groups/${groupId}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, vote }),
    });
    load();
  }

  async function handleResolve(predictionId: number, correct_answer: boolean) {
    if (!confirm(`Resolve as "${correct_answer ? "Yes" : "No"}"?`)) return;
    await fetch(`/api/groups/${groupId}/predictions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, correct_answer }),
    });
    load();
  }

  const active = predictions.filter(p => !p.resolved);
  const resolved = predictions.filter(p => p.resolved);

  return (
    <div className="space-y-4">
      {/* Create new */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-sm font-medium mb-2">Create a Prop Bet</h3>
        <div className="flex gap-2">
          <input
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
            placeholder="Will a 16 seed make the Sweet 16?"
            className="flex-1 border rounded px-3 py-2 text-sm"
            maxLength={200}
          />
          <button
            onClick={handleCreate}
            disabled={!newQuestion.trim() || submitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Post
          </button>
        </div>
      </div>

      {/* Active predictions */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">🔴 Active</h3>
          {active.map(p => (
            <PredictionCard key={p.id} prediction={p} userId={userId} isCreator={isCreator} onVote={handleVote} onResolve={handleResolve} />
          ))}
        </div>
      )}

      {/* Resolved predictions */}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">✅ Resolved</h3>
          {resolved.map(p => (
            <PredictionCard key={p.id} prediction={p} userId={userId} isCreator={isCreator} onVote={handleVote} onResolve={handleResolve} />
          ))}
        </div>
      )}

      {predictions.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">No prop bets yet. Create one to get the conversation going!</p>
      )}
    </div>
  );
}

function PredictionCard({
  prediction: p,
  userId,
  isCreator,
  onVote,
  onResolve,
}: {
  prediction: Prediction;
  userId: number;
  isCreator: boolean;
  onVote: (id: number, vote: boolean) => void;
  onResolve: (id: number, answer: boolean) => void;
}) {
  const yesVotes = p.votes.filter(v => v.vote);
  const noVotes = p.votes.filter(v => !v.vote);
  const total = p.votes.length;
  const myVote = p.votes.find(v => v.userId === userId);
  const yesPct = total > 0 ? Math.round((yesVotes.length / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${p.resolved ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium dark:text-white">{p.question}</p>
        <span className="text-[10px] text-gray-400 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</span>
      </div>
      <p className="text-xs text-gray-400 mb-3">by {p.creator_name}</p>

      {/* Vote bar */}
      {total > 0 && (
        <div className="mb-3">
          <div className="flex h-5 rounded overflow-hidden text-[10px] font-bold">
            {yesPct > 0 && (
              <div className="bg-green-500 text-white flex items-center justify-center" style={{ width: `${yesPct}%` }}>
                {yesPct}%
              </div>
            )}
            {noPct > 0 && (
              <div className="bg-red-400 text-white flex items-center justify-center" style={{ width: `${noPct}%` }}>
                {noPct}%
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>👍 Yes ({yesVotes.length}): {yesVotes.map(v => v.username).join(", ") || "—"}</span>
            <span>👎 No ({noVotes.length}): {noVotes.map(v => v.username).join(", ") || "—"}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      {!p.resolved && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onVote(p.id, true)}
            className={`px-3 py-1 text-xs rounded transition ${myVote?.vote === true ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
          >
            👍 Yes
          </button>
          <button
            onClick={() => onVote(p.id, false)}
            className={`px-3 py-1 text-xs rounded transition ${myVote?.vote === false ? "bg-red-500 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
          >
            👎 No
          </button>
          {isCreator && (
            <div className="ml-auto flex gap-1">
              <button onClick={() => onResolve(p.id, true)} className="px-2 py-1 text-[10px] bg-green-50 text-green-700 rounded hover:bg-green-100 transition">
                Resolve ✅ Yes
              </button>
              <button onClick={() => onResolve(p.id, false)} className="px-2 py-1 text-[10px] bg-red-50 text-red-700 rounded hover:bg-red-100 transition">
                Resolve ❌ No
              </button>
            </div>
          )}
        </div>
      )}

      {p.resolved && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded font-bold ${p.correct_answer ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            Answer: {p.correct_answer ? "✅ Yes" : "❌ No"}
          </span>
          <span className="text-gray-400">
            {p.votes.filter(v => v.vote === p.correct_answer).length}/{total} got it right
          </span>
        </div>
      )}
    </div>
  );
}
