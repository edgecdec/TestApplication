"use client";

import { useState, useRef, useCallback } from "react";

const MAX_NOTES_LENGTH = 1000;

interface BracketNotesProps {
  bracketId: number;
  initialNotes: string;
  locked: boolean;
}

export default function BracketNotes({ bracketId, initialNotes, locked }: BracketNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedRef = useRef(initialNotes);

  const saveNotes = useCallback(async (value: string) => {
    if (value === savedRef.current) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/brackets/${bracketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      if (res.ok) {
        savedRef.current = value;
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, [bracketId]);

  if (locked && !notes) return null;

  return (
    <details className="max-w-screen-2xl mx-auto mb-3 no-print bg-gray-50 dark:bg-gray-800 rounded p-2">
      <summary className="text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">
        📝 Notes {notes ? `(${notes.length})` : ""}
      </summary>
      <div className="mt-2">
        {locked ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notes}</p>
        ) : (
          <>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
              onBlur={() => saveNotes(notes)}
              placeholder="Add strategy notes, reasoning for key picks…"
              className="w-full border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y"
              rows={3}
              maxLength={MAX_NOTES_LENGTH}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">{notes.length}/{MAX_NOTES_LENGTH}</span>
              <span className="text-xs">
                {saving && <span className="text-blue-500">Saving…</span>}
                {saved && <span className="text-green-600">✓ Saved</span>}
              </span>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
