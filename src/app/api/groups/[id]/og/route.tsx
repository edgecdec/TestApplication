import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { scoreBracket } from "@/lib/scoring";
import { parseBracketData } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import { CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";

const MAX_ROWS = 5;
const MEDALS = ["🥇", "🥈", "🥉"];

interface BracketWithUser extends Bracket {
  username: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT name, scoring_settings FROM groups WHERE id = ?").get(id) as
    | { name: string; scoring_settings: string }
    | undefined;

  if (!group) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#94a3b8", fontSize: 32, fontFamily: "sans-serif" }}>
        Group not found
      </div>,
      { width: 1200, height: 630 },
    );
  }

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as BracketWithUser[];

  if (brackets.length === 0) {
    return renderEmpty(group.name, brackets.length);
  }

  const tournamentId = brackets[0].tournament_id;
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) {
    return renderEmpty(group.name, brackets.length);
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const hasResults = Object.keys(results).length > 0;

  const scored = brackets.map((b) => {
    const picks: Picks = JSON.parse(b.picks);
    const champion = picks[CHAMPIONSHIP_GAME_ID] ?? null;
    const score = scoreBracket(b.id, b.name, b.username, b.user_id, picks, results, settings, regions, b.tiebreaker, null);
    return { username: b.username, bracketName: b.name, total: score.total, champion };
  });

  scored.sort((a, b) => b.total - a.total);
  const top = scored.slice(0, MAX_ROWS);

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", fontFamily: "sans-serif", padding: 48 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 32 }}>
        <span style={{ fontSize: 48, marginRight: 16 }}>🏀</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#f97316" }}>{group.name}</span>
          <span style={{ fontSize: 20, color: "#94a3b8" }}>
            {brackets.length} bracket{brackets.length !== 1 ? "s" : ""} competing
            {hasResults ? " · Live standings" : ""}
          </span>
        </div>
      </div>

      {/* Standings rows */}
      {hasResults ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          {top.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                background: i === 0 ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
                borderRadius: 12,
                padding: "12px 20px",
                borderLeft: i === 0 ? "4px solid #f97316" : "4px solid transparent",
              }}
            >
              <span style={{ fontSize: 28, width: 48, textAlign: "center" }}>
                {i < MEDALS.length ? MEDALS[i] : `#${i + 1}`}
              </span>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>{entry.username}</span>
                {entry.bracketName && (
                  <span style={{ fontSize: 16, color: "#64748b" }}>{entry.bracketName}</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {entry.champion && (
                  <span style={{ fontSize: 16, color: "#94a3b8" }}>🏆 {entry.champion}</span>
                )}
                <span style={{ fontSize: 28, fontWeight: 700, color: "#f97316" }}>{entry.total}</span>
                <span style={{ fontSize: 16, color: "#64748b" }}>pts</span>
              </div>
            </div>
          ))}
          {scored.length > MAX_ROWS && (
            <span style={{ fontSize: 16, color: "#64748b", textAlign: "center", marginTop: 4 }}>
              +{scored.length - MAX_ROWS} more
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 24, color: "#64748b" }}>Brackets locked — waiting for games to start</span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <span style={{ fontSize: 16, color: "#475569" }}>March Madness Picker</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

function renderEmpty(name: string, count: number) {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", fontFamily: "sans-serif" }}>
      <span style={{ fontSize: 80, marginBottom: 16 }}>🏀</span>
      <span style={{ fontSize: 48, fontWeight: 700, color: "#f97316" }}>{name}</span>
      <span style={{ fontSize: 24, color: "#94a3b8", marginTop: 12 }}>
        {count === 0 ? "Join the pool and compete with friends!" : `${count} brackets competing`}
      </span>
    </div>,
    { width: 1200, height: 630 },
  );
}
