"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface GroupPreview {
  id: number;
  name: string;
  invite_code: string;
  member_count: number;
  creator_name: string;
}

export default function JoinGroupPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<GroupPreview | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [meRes, gRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/groups/join/${code}`),
      ]);
      setAuthed(meRes.ok && (await meRes.json()).user);
      if (gRes.ok) {
        setGroup((await gRes.json()).group);
      } else {
        setError("Invalid or expired invite link.");
      }
      setLoading(false);
    }
    load();
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    const res = await fetch(`/api/groups/join/${code}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/groups/${data.id}`);
    } else {
      setError("Failed to join group.");
      setJoining(false);
    }
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;

  if (error || !group) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-sm">
          <p className="text-red-600 mb-4">{error || "Group not found."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 text-center max-w-sm w-full">
        <h1 className="text-xl font-bold mb-2">🏀 Join Group</h1>
        <p className="text-lg font-semibold mb-1">{group.name}</p>
        <p className="text-sm text-gray-500 mb-4">Created by {group.creator_name} · {group.member_count} member{group.member_count !== 1 ? "s" : ""}</p>
        {authed ? (
          <button onClick={handleJoin} disabled={joining} className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50">
            {joining ? "Joining..." : "Join Group"}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Log in or register to join this group.</p>
            <div className="flex gap-2">
              <button onClick={() => router.push(`/login?redirect=/join/${code}`)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Log In</button>
              <button onClick={() => router.push(`/register?redirect=/join/${code}`)} className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">Register</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
