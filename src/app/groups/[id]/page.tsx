import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import GroupDetailClient from "./GroupDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare(
    "SELECT g.name, COUNT(DISTINCT gb.bracket_id) as bracket_count FROM groups g LEFT JOIN group_brackets gb ON g.id = gb.group_id WHERE g.id = ? GROUP BY g.id"
  ).get(id) as { name: string; bracket_count: number } | undefined;

  if (!row) {
    return { title: "Group Not Found" };
  }

  const title = row.name;
  const description = `${row.name} — ${row.bracket_count} bracket${row.bracket_count !== 1 ? "s" : ""} competing on March Madness Picker`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og?title=${encodeURIComponent(row.name)}&subtitle=${encodeURIComponent(`${row.bracket_count} brackets competing`)}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function GroupDetailPage() {
  return <GroupDetailClient />;
}
