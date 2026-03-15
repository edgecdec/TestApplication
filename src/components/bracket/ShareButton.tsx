"use client";

import { useState } from "react";
import { generateShareText } from "@/lib/share-text";
import type { Picks } from "@/types/bracket";
import type { RegionData } from "@/types/tournament";

const COPIED_DISPLAY_MS = 2000;

interface ShareButtonProps {
  bracketName: string;
  bracketId: number;
  picks: Picks;
  regions: RegionData[];
}

export default function ShareButton({ bracketName, bracketId, picks, regions }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const bracketUrl = `${window.location.origin}/bracket/${bracketId}`;
    const text = generateShareText({ bracketName, picks, regions, bracketUrl });
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_DISPLAY_MS);
  }

  return (
    <button
      onClick={handleShare}
      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
      title="Copy bracket summary to clipboard"
    >
      {copied ? "✅ Copied!" : "📤 Share"}
    </button>
  );
}
