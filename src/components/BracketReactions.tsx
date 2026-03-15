"use client";

import { REACTION_EMOJIS } from "@/types/reactions";
import type { ReactionCount } from "@/types/reactions";

interface Props {
  bracketId: number;
  reactions: ReactionCount[];
  onToggle: (bracketId: number, emoji: string) => void;
}

export default function BracketReactions({ bracketId, reactions, onToggle }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      {REACTION_EMOJIS.map((emoji) => {
        const r = reactions.find((rc) => rc.emoji === emoji);
        const count = r?.count ?? 0;
        const reacted = r?.reacted ?? false;
        return (
          <button
            key={emoji}
            onClick={() => onToggle(bracketId, emoji)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition ${
              reacted
                ? "bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
            } ${count === 0 && !reacted ? "opacity-40 hover:opacity-100" : ""}`}
            title={`${emoji} ${count}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
