"use client";

import { useEffect, useState } from "react";

interface Member {
  username: string;
  userId: number;
}

interface Props {
  groupId: string;
  creatorId: number;
  onMemberRemoved: () => void;
}

export default function MemberManager({ groupId, creatorId, onMemberRemoved }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/member-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(data.members.map((m: Member) => ({ username: m.username, userId: m.userId })));
        }
      })
      .catch(() => {});
  }, [groupId]);

  async function handleRemove(userId: number, username: string) {
    if (!confirm(`Remove ${username} from this group? Their brackets will be unassigned.`)) return;
    setRemoving(userId);
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      onMemberRemoved();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to remove member");
    }
    setRemoving(null);
  }

  if (members.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Members ({members.length})</label>
      <div className="border rounded divide-y text-sm max-h-60 overflow-y-auto">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
            <span>
              {m.username}
              {m.userId === creatorId && <span className="ml-1 text-xs text-amber-600">👑 Creator</span>}
            </span>
            {m.userId !== creatorId && (
              <button
                onClick={() => handleRemove(m.userId, m.username)}
                disabled={removing === m.userId}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                {removing === m.userId ? "Removing..." : "Remove"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
