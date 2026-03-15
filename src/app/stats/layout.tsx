import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bracket Stats",
  description: "Most popular champion picks, biggest upsets, and bracket trends",
  openGraph: {
    title: "Bracket Stats — March Madness Picker",
    description: "Most popular champion picks, biggest upsets, and bracket trends",
    images: [{ url: "/api/og?title=Bracket%20Stats&subtitle=Champion%20picks%2C%20upsets%2C%20and%20trends", width: 1200, height: 630 }],
  },
};

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
