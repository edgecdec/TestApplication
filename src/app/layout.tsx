import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "March Madness Picker",
  description: "Fill out your NCAA March Madness bracket and compete with friends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
