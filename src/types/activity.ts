export type ActivityType = "member_joined" | "bracket_added" | "bracket_completed" | "bracket_updated";

export interface GroupActivity {
  id: number;
  group_id: number;
  user_id: number;
  username: string;
  activity_type: ActivityType;
  metadata: string; // JSON string with extra info (bracket name, etc.)
  created_at: string;
}
