export type NotificationType =
  | "results_synced"
  | "chat_message"
  | "member_joined"
  | "bracket_locked"
  | "round_complete";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}
