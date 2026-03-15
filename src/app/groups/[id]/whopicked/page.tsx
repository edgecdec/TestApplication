"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REGION_COLORS, ROUND_NAMES } from "@/lib/bracket-constants";
import type { RegionName } from "@/lib/bracket-constants";
import WhoPickedGameCard from "@/components/bracket/WhoPickedGameCard";
import type { WhoPickedResponse } from "@/types/whopicked";

const REGIONAL_ROUND_NAMES = ROUND_NAMES.slice(0, 4);

export default function WhoPickedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<WhoPickedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/groups/${id}/whopicked`)
      .then((r) => r.ok ? r.json() : r.json().then((e) => Promise.reject(e.error)))
      .then(setData)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;
  if (error || !data) return (
    <main className="flex min-h-screen items-center justify-center flex-col gap-4">
      <p className="text-red-600">{error}</p>
      <button onClick={() => router.back()} className="text-blue-600 underline">Go Back</button>
    </main>
  );

  const lowerSearch = search.toLowerCase();
  const matchesSearch = (game: WhoPickedResponse["finalFour"][0]) => {
    if (!search) return true;
    return game.picks.some((tp) => tp.team.toLowerCase().includes(lowerSearch));
  };

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push(`/groups/${id}`)} className="text-blue-600 hover:underline text-sm">← Back to Group</button>
        <h1 className="text-lg font-bold">🔍 Who Picked Whom — {data.groupName}</h1>
        <span className="text-xs text-gray-500">{data.totalBrackets} bracket{data.totalBrackets !== 1 ? "s" : ""}</span>
      </div>

      <input
        type="text"
        placeholder="Search team..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded px-3 py-1.5 text-sm mb-4 w-64"
      />

      {/* Championship */}
      {data.championship && matchesSearch(data.championship) && (
        <details open className="mb-4">
          <summary className="font-bold cursor-pointer mb-2">🏆 Championship</summary>
          <WhoPickedGameCard game={data.championship} totalBrackets={data.totalBrackets} regionColor="#ca8a04" />
        </details>
      )}

      {/* Final Four */}
      <details open className="mb-4">
        <summary className="font-bold cursor-pointer mb-2">🏀 Final Four</summary>
        {data.finalFour.filter(matchesSearch).map((g) => (
          <WhoPickedGameCard key={g.gameId} game={g} totalBrackets={data.totalBrackets} regionColor="#ca8a04" />
        ))}
      </details>

      {/* Regions */}
      {data.regions.map((region) => {
        const color = REGION_COLORS[region.name as RegionName] ?? "#888";
        return (
          <details key={region.name} className="mb-4">
            <summary className="font-bold cursor-pointer mb-2" style={{ color }}>{region.name}</summary>
            {region.rounds.map((games, roundIdx) => {
              const filtered = games.filter(matchesSearch);
              if (filtered.length === 0) return null;
              return (
                <div key={roundIdx} className="mb-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">{REGIONAL_ROUND_NAMES[roundIdx]}</div>
                  {filtered.map((g) => (
                    <WhoPickedGameCard key={g.gameId} game={g} totalBrackets={data.totalBrackets} regionColor={color} />
                  ))}
                </div>
              );
            })}
          </details>
        );
      })}
    </main>
  );
}
