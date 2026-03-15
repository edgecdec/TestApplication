"use client";

import { useEffect, useState } from "react";

interface Shortcut {
  keys: string[];
  description: string;
  context?: string;
}

const IS_MAC = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl";

const SHORTCUTS: { section: string; items: Shortcut[] }[] = [
  {
    section: "Global",
    items: [
      { keys: [`${MOD}+K`], description: "Open command palette" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    section: "Bracket Editor",
    items: [
      { keys: ["↑", "↓"], description: "Move between games" },
      { keys: ["1", "2"], description: "Pick top / bottom team" },
      { keys: ["Enter"], description: "Pick highlighted team" },
      { keys: ["Tab"], description: "Jump to next unfilled game" },
      { keys: [`${MOD}+Z`], description: "Undo last pick" },
      { keys: [`${MOD}+Shift+Z`], description: "Redo pick" },
    ],
  },
  {
    section: "Dialogs",
    items: [
      { keys: ["Escape"], description: "Close dialog / modal" },
    ],
  },
];

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "?" && !isTyping(e)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">⌨️ Keyboard Shortcuts</h2>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4 space-y-4">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{section.section}</h3>
              <div className="space-y-1.5">
                {section.items.map((s) => (
                  <div key={s.description} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{s.description}</span>
                    <div className="flex gap-1">
                      {s.keys.map((k) => (
                        <kbd key={k} className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-300">{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">?</kbd> or <kbd className="px-1 py-0.5 font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}

function isTyping(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable === true;
}
