import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overall Leaderboard",
  description: "See how all brackets rank across the entire tournament",
  openGraph: {
    title: "Overall Leaderboard — March Madness Picker",
    description: "See how all brackets rank across the entire tournament",
    images: [{ url: "/api/og?title=Overall%20Leaderboard&subtitle=All%20brackets%20ranked", width: 1200, height: 630 }],
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
