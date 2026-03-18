import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { autoFillIncompleteBrackets } from "@/lib/autofill-at-lock";
import type { Tournament } from "@/types/tournament";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json({ tournament });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, bracket_data, results_data, lock_time } = body;

  const db = getDb();
  const existing = db.prepare("SELECT id FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (bracket_data !== undefined) { fields.push("bracket_data = ?"); values.push(typeof bracket_data === "string" ? bracket_data : JSON.stringify(bracket_data)); }
  if (results_data !== undefined) { fields.push("results_data = ?"); values.push(typeof results_data === "string" ? results_data : JSON.stringify(results_data)); }
  if (lock_time !== undefined) { fields.push("lock_time = ?"); values.push(lock_time); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(Number(id));
  db.prepare(`UPDATE tournaments SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  // Auto-fill incomplete brackets if results were updated
  let autoFilled = 0;
  if (results_data !== undefined) {
    autoFilled = autoFillIncompleteBrackets(Number(id));
  }

  return NextResponse.json({ success: true, autoFilledBrackets: autoFilled });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const tournamentId = Number(id);
  const db = getDb();

  const existing = db.prepare("SELECT id FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Get all bracket IDs for this tournament for cascade cleanup
  const bracketIds = (db.prepare("SELECT id FROM brackets WHERE tournament_id = ?").all(tournamentId) as { id: number }[]).map(b => b.id);

  const del = db.transaction(() => {
    if (bracketIds.length > 0) {
      const placeholders = bracketIds.map(() => "?").join(",");
      db.prepare(`DELETE FROM bracket_reactions WHERE bracket_id IN (${placeholders})`).run(...bracketIds);
      db.prepare(`DELETE FROM group_brackets WHERE bracket_id IN (${placeholders})`).run(...bracketIds);
      // Delete notifications linking to deleted brackets
      for (const bid of bracketIds) {
        db.prepare("DELETE FROM notifications WHERE link LIKE ?").run(`%/bracket/${bid}%`);
      }
    }
    // Delete bracket-related group_activity for users with brackets in this tournament
    const userIds = (db.prepare("SELECT DISTINCT user_id FROM brackets WHERE tournament_id = ?").all(tournamentId) as { user_id: number }[]).map(u => u.user_id);
    if (userIds.length > 0) {
      const uPlaceholders = userIds.map(() => "?").join(",");
      db.prepare(`DELETE FROM group_activity WHERE user_id IN (${uPlaceholders}) AND activity_type IN ('bracket_added', 'bracket_completed', 'bracket_updated')`).run(...userIds);
    }
    // Delete bracket history for all brackets in this tournament
    if (bracketIds.length > 0) {
      const bhPlaceholders = bracketIds.map(() => "?").join(",");
      db.prepare(`DELETE FROM bracket_history WHERE bracket_id IN (${bhPlaceholders})`).run(...bracketIds);
    }
    db.prepare("DELETE FROM brackets WHERE tournament_id = ?").run(tournamentId);
    db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournamentId);
  });

  del();

  return NextResponse.json({ success: true });
}
