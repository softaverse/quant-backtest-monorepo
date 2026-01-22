/**
 * Authentication types
 */

export interface User {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthStatus {
  authenticated: boolean;
  user: User | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
