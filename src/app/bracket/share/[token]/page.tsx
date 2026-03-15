import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import type { Bracket } from "@/types/tournament";
import SharedBracketClient from "./SharedBracketClient";

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const db = getDb();
  const row = db.prepare(
    "SELECT b.name, u.username FROM brackets b JOIN users u ON b.user_id = u.id WHERE b.share_token = ?"
  ).get(token) as { name: string; username: string } | undefined;

  if (!row) return { title: "Bracket Not Found" };

  const title = `${row.name} — ${row.username}'s Bracket`;
  const description = `View ${row.username}'s March Madness bracket "${row.name}"`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og?title=${encodeURIComponent(row.name)}&subtitle=${encodeURIComponent(`by ${row.username}`)}`, width: 1200, height: 630 }],
    },
  };
}

export default function SharedBracketPage() {
  return <SharedBracketClient />;
}
