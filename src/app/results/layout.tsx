import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament Results",
  description: "View actual NCAA March Madness tournament results bracket",
  openGraph: {
    title: "Tournament Results — March Madness Picker",
    description: "View actual NCAA March Madness tournament results bracket",
    images: [{ url: "/api/og?title=Tournament%20Results&subtitle=Actual%20NCAA%20tournament%20outcomes", width: 1200, height: 630 }],
  },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
