import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Bracket } from "@/types/tournament";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const bracket = db.prepare("SELECT * FROM brackets WHERE id = ?").get(id) as Bracket | undefined;
  if (!bracket) return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  if (bracket.user_id !== user.id) return NextResponse.json({ error: "Not your bracket" }, { status: 403 });

  if (bracket.share_token) {
    return NextResponse.json({ share_token: bracket.share_token });
  }

  const token = randomUUID();
  db.prepare("UPDATE brackets SET share_token = ? WHERE id = ?").run(token, id);
  return NextResponse.json({ share_token: token });
}
