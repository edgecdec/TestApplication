import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

interface RouteContext { params: Promise<{ id: string }> }

interface PredictionRow {
  id: number;
  group_id: number;
  creator_id: number;
  creator_name: string;
  question: string;
  resolved: number;
  correct_answer: number | null;
  created_at: string;
}

interface VoteRow {
  prediction_id: number;
  user_id: number;
  username: string;
  vote: number;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();

  const rows = db.prepare(`
    SELECT gp.*, u.username as creator_name
    FROM group_predictions gp
    JOIN users u ON gp.creator_id = u.id
    WHERE gp.group_id = ?
    ORDER BY gp.created_at DESC
  `).all(Number(id)) as PredictionRow[];

  const predictionIds = rows.map(r => r.id);
  let votes: VoteRow[] = [];
  if (predictionIds.length > 0) {
    const placeholders = predictionIds.map(() => "?").join(",");
    votes = db.prepare(`
      SELECT pv.prediction_id, pv.user_id, u.username, pv.vote
      FROM prediction_votes pv
      JOIN users u ON pv.user_id = u.id
      WHERE pv.prediction_id IN (${placeholders})
    `).all(...predictionIds) as VoteRow[];
  }

  const voteMap = new Map<number, VoteRow[]>();
  for (const v of votes) {
    const arr = voteMap.get(v.prediction_id) || [];
    arr.push(v);
    voteMap.set(v.prediction_id, arr);
  }

  const predictions = rows.map(r => ({
    id: r.id,
    group_id: r.group_id,
    creator_id: r.creator_id,
    creator_name: r.creator_name,
    question: r.question,
    resolved: !!r.resolved,
    correct_answer: r.correct_answer === null ? null : !!r.correct_answer,
    created_at: r.created_at,
    votes: (voteMap.get(r.id) || []).map(v => ({
      userId: v.user_id,
      username: v.username,
      vote: !!v.vote,
    })),
  }));

  return NextResponse.json({ predictions });
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const groupId = Number(id);
  const db = getDb();

  // Verify membership
  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, user.id);
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const body = await req.json();
  const { question, vote, predictionId } = body;

  // Vote on existing prediction
  if (predictionId !== undefined && vote !== undefined) {
    const pred = db.prepare("SELECT id, resolved FROM group_predictions WHERE id = ? AND group_id = ?").get(predictionId, groupId) as { id: number; resolved: number } | undefined;
    if (!pred) return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    if (pred.resolved) return NextResponse.json({ error: "Already resolved" }, { status: 400 });

    db.prepare(`
      INSERT INTO prediction_votes (prediction_id, user_id, vote)
      VALUES (?, ?, ?)
      ON CONFLICT(prediction_id, user_id) DO UPDATE SET vote = excluded.vote
    `).run(predictionId, user.id, vote ? 1 : 0);

    return NextResponse.json({ ok: true });
  }

  // Create new prediction
  if (question && typeof question === "string" && question.trim()) {
    const result = db.prepare(
      "INSERT INTO group_predictions (group_id, creator_id, question) VALUES (?, ?, ?)"
    ).run(groupId, user.id, question.trim());

    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const groupId = Number(id);
  const db = getDb();

  // Only group creator can resolve
  const group = db.prepare("SELECT created_by FROM groups WHERE id = ?").get(groupId) as { created_by: number } | undefined;
  if (!group || group.created_by !== user.id) {
    return NextResponse.json({ error: "Only group creator can resolve" }, { status: 403 });
  }

  const { predictionId, correct_answer } = await req.json();
  if (predictionId === undefined || correct_answer === undefined) {
    return NextResponse.json({ error: "predictionId and correct_answer required" }, { status: 400 });
  }

  db.prepare(
    "UPDATE group_predictions SET resolved = 1, correct_answer = ? WHERE id = ? AND group_id = ?"
  ).run(correct_answer ? 1 : 0, predictionId, groupId);

  return NextResponse.json({ ok: true });
}
