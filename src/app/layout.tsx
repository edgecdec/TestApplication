import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp";
import ClientProviders from "@/components/ClientProviders";

const APP_TITLE = "March Madness Picker";
const APP_DESCRIPTION = "Fill out your NCAA March Madness bracket and compete with friends";

export const metadata: Metadata = {
  title: { default: APP_TITLE, template: `%s | ${APP_TITLE}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_TITLE },
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    type: "website",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: APP_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    images: ["/api/og"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/api/pwa-icon?size=192",
  },
};

const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem('theme-preference')==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <ClientProviders>
          <Navbar />
          <CommandPalette />
          <KeyboardShortcutsHelp />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
