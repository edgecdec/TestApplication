"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GroupMessage } from "@/types/chat";

const POLL_INTERVAL_MS = 10000;

export default function GroupChat({ groupId, currentUser }: { groupId: string; currentUser: string }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch(`/api/groups/${groupId}/messages`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMessages(d.messages); })
      .catch(() => {});
  }, [groupId]);

  useEffect(() => {
    load();
    const iv = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      setText("");
      load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-medium mb-2">💬 Group Chat</h3>
      <div className="h-60 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-16">No messages yet. Start the conversation!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="mb-1">
            <span className={`text-xs font-semibold ${m.username === currentUser ? "text-blue-600" : "text-gray-700"}`}>{m.username}</span>
            <span className="text-sm ml-1">{m.message}</span>
            <span className="text-xs text-gray-400 ml-1">{new Date(m.created_at + "Z").toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-1.5 text-sm"
          placeholder="Type a message..."
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
