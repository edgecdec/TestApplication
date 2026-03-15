import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import ProfileClient from "./ProfileClient";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const db = getDb();
  const row = db.prepare(
    "SELECT u.username, COUNT(b.id) as bracket_count FROM users u LEFT JOIN brackets b ON u.id = b.user_id WHERE u.username = ? GROUP BY u.id"
  ).get(decoded) as { username: string; bracket_count: number } | undefined;

  if (!row) {
    return { title: "User Not Found" };
  }

  const title = `${row.username}'s Profile`;
  const description = `${row.username} has ${row.bracket_count} bracket${row.bracket_count !== 1 ? "s" : ""} on March Madness Picker`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og?title=${encodeURIComponent(row.username)}&subtitle=${encodeURIComponent(`${row.bracket_count} brackets`)}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ProfilePage() {
  return <ProfileClient />;
}
