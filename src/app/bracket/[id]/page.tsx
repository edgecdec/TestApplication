import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import type { Bracket } from "@/types/tournament";
import BracketPageClient from "./BracketPageClient";

interface BracketRow extends Bracket {
  username: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(
    "SELECT b.name, u.username FROM brackets b JOIN users u ON b.user_id = u.id WHERE b.id = ?"
  ).get(id) as { name: string; username: string } | undefined;

  if (!row) {
    return { title: "Bracket Not Found" };
  }

  const title = `${row.name} — ${row.username}`;
  const description = `View ${row.username}'s bracket "${row.name}" on March Madness Picker`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og?title=${encodeURIComponent(row.name)}&subtitle=${encodeURIComponent(`by ${row.username}`)}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function BracketPage() {
  return <BracketPageClient />;
}
