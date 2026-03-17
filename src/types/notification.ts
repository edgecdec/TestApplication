export type NotificationType =
  | "results_synced"
  | "chat_message"
  | "member_joined"
  | "member_left"
  | "bracket_locked"
  | "round_complete"
  | "admin_broadcast";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
}
