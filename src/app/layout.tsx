import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "March Madness Picker",
  description: "Fill out your NCAA March Madness bracket and compete with friends",
};

const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('theme-preference')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
