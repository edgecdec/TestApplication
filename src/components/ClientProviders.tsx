"use client";

import type { ReactNode } from "react";
import { SpoilerProvider } from "@/contexts/SpoilerContext";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <SpoilerProvider>{children}</SpoilerProvider>;
}
