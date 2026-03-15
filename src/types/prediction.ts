export interface Prediction {
  id: number;
  group_id: number;
  creator_id: number;
  creator_name: string;
  question: string;
  resolved: boolean;
  correct_answer: boolean | null;
  created_at: string;
  votes: { userId: number; username: string; vote: boolean }[];
}
