"use client";

import { useState } from "react";

const COPIED_DISPLAY_MS = 2000;

export default function PublicShareButton({ bracketId }: { bracketId: number }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch(`/api/brackets/${bracketId}/share`, { method: "POST" });
      if (!res.ok) { alert("Failed to generate share link"); return; }
      const { share_token } = await res.json();
      const url = `${window.location.origin}/bracket/share/${share_token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_DISPLAY_MS);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition"
      title="Copy a public link anyone can view (no login required)"
    >
      {copied ? "✅ Link Copied!" : loading ? "…" : "🔗 Public Link"}
    </button>
  );
}
