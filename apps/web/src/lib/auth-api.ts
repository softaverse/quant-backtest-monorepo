/**
 * Authentication API functions
 */

import type { AuthStatus } from "@/types/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const getApiUrl = (path: string) => {
  if (API_BASE_URL.includes("/api")) {
    return `${API_BASE_URL}${path}`;
  }
  return `${API_BASE_URL}/api/v1${path}`;
};

/**
 * Get current user auth status
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(getApiUrl("/auth/me"), {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    return { authenticated: false, user: null };
  }

  return response.json();
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  await fetch(getApiUrl("/auth/logout"), {
    method: "POST",
    credentials: "include",
  });
}

/**
 * Get Google login URL - redirects to backend which handles OAuth
 */
export function getGoogleLoginUrl(): string {
  return getApiUrl("/auth/google");
}
