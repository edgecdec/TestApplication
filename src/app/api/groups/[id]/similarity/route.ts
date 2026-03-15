import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { SimilarityBracket, SimilarityPair, SimilarityData } from "@/types/similarity";

interface BracketRow {
  id: number;
  name: string;
  picks: string;
  username: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const rows = db.prepare(`
    SELECT b.id, b.name, b.picks, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
    ORDER BY u.username, b.name
  `).all(id) as BracketRow[];

  const brackets: SimilarityBracket[] = rows.map((r) => ({
    bracketId: r.id,
    bracketName: r.name,
    username: r.username,
  }));

  const pickMaps = rows.map((r) => {
    const raw = r.picks;
    if (!raw) return {};
    try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return {}; }
  }) as Record<string, string>[];

  const pairs: SimilarityPair[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const aKeys = Object.keys(pickMaps[i]);
      const bKeys = new Set(Object.keys(pickMaps[j]));
      const commonGames = aKeys.filter((k) => bKeys.has(k));
      const total = commonGames.length;
      const matching = total > 0 ? commonGames.filter((k) => pickMaps[i][k] === pickMaps[j][k]).length : 0;
      pairs.push({
        a: rows[i].id,
        b: rows[j].id,
        matching,
        total,
        percentage: total > 0 ? Math.round((matching / total) * 100) : 0,
      });
    }
  }

  const withGames = pairs.filter((p) => p.total > 0);
  const mostSimilar = withGames.length > 0 ? withGames.reduce((best, p) => p.percentage > best.percentage ? p : best) : null;
  const mostDifferent = withGames.length > 0 ? withGames.reduce((best, p) => p.percentage < best.percentage ? p : best) : null;

  const data: SimilarityData = { brackets, pairs, mostSimilar, mostDifferent };
  return NextResponse.json(data);
}
