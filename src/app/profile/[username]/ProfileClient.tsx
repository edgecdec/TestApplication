"use client";

import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useParams, useRouter } from "next/navigation";
import type { ProfileData } from "@/types/profile";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import BracketGrade from "@/components/BracketGrade";
import BracketAchievements from "@/components/BracketAchievements";
import PasswordChange from "@/components/PasswordChange";

export default function ProfileClient() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!username) return;
    Promise.all([
      fetch(`/api/profile/${encodeURIComponent(username)}`),
      fetch("/api/auth/me"),
    ]).then(async ([profileRes, meRes]) => {
      if (!profileRes.ok) throw new Error(profileRes.status === 401 ? "Not authenticated" : "User not found");
      const profileData = await profileRes.json();
      setProfile(profileData);
      if (meRes.ok) {
        const meData = await meRes.json();
        setIsOwnProfile(meData?.user?.username === profileData.username);
      }
    }).catch((e) => setError(e.message));
  }, [username]);

  if (error) {
    return (
      <main className="min-h-screen p-8 max-w-2xl mx-auto">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!profile) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">🏀 {profile.username}</h1>
      <p className="text-gray-500 text-sm mb-6">Joined {new Date(profile.createdAt).toLocaleDateString()}</p>

      {/* Groups */}
      <h2 className="text-lg font-semibold mb-2">Groups ({profile.groups.length})</h2>
      {profile.groups.length === 0 ? (
        <p className="text-gray-400 text-sm mb-6">No groups yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-6">
          {profile.groups.map((g) => (
            <button
              key={g.id}
              onClick={() => router.push(`/groups/${g.id}`)}
              className="px-3 py-1 text-sm border rounded-full hover:bg-gray-50 transition"
            >
              {g.name} ({g.memberCount})
            </button>
          ))}
        </div>
      )}

      {/* Brackets */}
      <h2 className="text-lg font-semibold mb-2">Brackets ({profile.brackets.length})</h2>
      {profile.brackets.length === 0 ? (
        <p className="text-gray-400 text-sm">No brackets submitted.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Bracket</th>
                {ROUND_NAMES.map((rn) => (
                  <th key={rn} className="text-right px-3 py-2 font-medium text-xs">{rn}</th>
                ))}
                <th className="text-right px-3 py-2 font-medium">Total</th>
                <th className="text-right px-3 py-2 font-medium">TB</th>
              </tr>
            </thead>
            <tbody>
              {profile.brackets.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <button onClick={() => router.push(`/bracket/${b.id}`)} className="text-blue-600 hover:underline">
                      {b.name}
                    </button>
                    {b.grade && <BracketGrade grade={b.grade} />}
                    <span className="text-xs text-gray-400 ml-2">{b.tournamentName}</span>
                    <BracketAchievements achievements={b.achievements ?? []} />
                  </td>
                  {b.rounds.map((r, i) => (
                    <td key={i} className="px-3 py-2 text-right text-xs">
                      {r.points}
                      {r.upsetBonus > 0 && <span className="text-green-600 ml-0.5">*</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold">{b.total}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{b.tiebreaker ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isOwnProfile && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">🔒 Change Password</h2>
          <div className="bg-white rounded-lg shadow p-4 max-w-sm">
            <PasswordChange />
          </div>
        </div>
      )}
    </main>
  );
}
