"use client";

import { useEffect, useState } from "react";
import { TOTAL_GAMES } from "@/lib/bracket-constants";

interface BracketInfo {
  id: number;
  name: string;
  pickCount: number;
}

interface MemberStatus {
  username: string;
  userId: number;
  brackets: BracketInfo[];
}

interface Props {
  groupId: string;
  groupName: string;
  inviteUrl: string;
}

export default function MemberBracketStatus({ groupId, groupName, inviteUrl }: Props) {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [lockTime, setLockTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/member-status`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setMembers(d.members ?? []);
          setLockTime(d.lockTime ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return null;

  const isLocked = lockTime ? new Date(lockTime) <= new Date() : false;
  if (isLocked) return null; // Only show before lock time

  const incomplete = members.filter((m) =>
    m.brackets.length === 0 || m.brackets.some((b) => b.pickCount < TOTAL_GAMES)
  );

  if (incomplete.length === 0) return null; // Everyone is done!

  function copyNudge() {
    const lockStr = lockTime ? new Date(lockTime).toLocaleString() : "soon";
    const names = incomplete.map((m) => m.username).join(", ");
    const text = `🏀 ${incomplete.length} people in "${groupName}" still need to finish their brackets before ${lockStr}: ${names}. Don't miss the deadline! ${inviteUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          📋 Bracket Status — {incomplete.length} incomplete
        </h3>
        <button
          onClick={copyNudge}
          className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition"
        >
          {copied ? "✓ Copied!" : "📲 Copy Reminder"}
        </button>
      </div>
      <ul className="space-y-1 text-sm">
        {members.map((m) => {
          const hasNoBracket = m.brackets.length === 0;
          const allComplete = !hasNoBracket && m.brackets.every((b) => b.pickCount >= TOTAL_GAMES);
          return (
            <li key={m.userId} className="flex items-center gap-2">
              {allComplete ? (
                <span className="text-green-600">✅</span>
              ) : hasNoBracket ? (
                <span className="text-red-500">❌</span>
              ) : (
                <span className="text-amber-500">⚠️</span>
              )}
              <span className={`font-medium ${allComplete ? "text-gray-500 dark:text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>
                {m.username}
              </span>
              {hasNoBracket ? (
                <span className="text-xs text-red-500">No bracket</span>
              ) : (
                m.brackets.map((b) => (
                  <span key={b.id} className={`text-xs ${b.pickCount >= TOTAL_GAMES ? "text-green-600" : "text-amber-600"}`}>
                    {b.name}: {b.pickCount}/{TOTAL_GAMES}
                  </span>
                ))
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
