export interface User {
  id: number;
  username: string;
  is_admin: number;
  created_at: string;
}

export interface UserRow extends User {
  password_hash: string;
}

export interface JwtPayload {
  userId: number;
  username: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  user?: { id: number; username: string; isAdmin: boolean };
  error?: string;
}
