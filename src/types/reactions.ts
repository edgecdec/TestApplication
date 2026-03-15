export const REACTION_EMOJIS = ["🔥", "🗑️", "💀", "👑", "🤡"] as const;
export type ReactionEmoji = typeof REACTION_EMOJIS[number];

export interface ReactionCount {
  emoji: ReactionEmoji;
  count: number;
  reacted: boolean; // whether the current user reacted with this emoji
}

export interface BracketReactions {
  [bracketId: number]: ReactionCount[];
}
