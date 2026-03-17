"use client";

import { useState } from "react";

const MAX_MESSAGE_LENGTH = 500;

export default function AdminBroadcast() {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), link: link.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`✅ Sent to ${data.notified} user${data.notified === 1 ? "" : "s"}`);
        setMessage("");
        setLink("");
      } else {
        setResult(`❌ ${data.error}`);
      }
    } catch {
      setResult("❌ Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your announcement..."
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
      />
      <div className="flex items-center gap-2">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (optional, e.g. /dashboard)"
          className="flex-1 border rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600"
        />
        <span className="text-xs text-gray-400">{message.length}/{MAX_MESSAGE_LENGTH}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {sending ? "Sending..." : "📢 Send to All Users"}
        </button>
        {result && <span className="text-sm">{result}</span>}
      </div>
    </div>
  );
}
