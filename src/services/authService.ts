// authService.ts — Client-side authentication service for ACADSYNC v2.0.0
//
// Manages authentication state, session storage in localStorage, and role verification.
// Implements Section 7.1 and 7.2 of the Scope Document.

export type UserRole = "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teacher_id?: string | null;
  class_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = "acadsync_auth_token";
const USER_KEY = "acadsync_auth_user";

class AuthService {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }

  hasRole(allowedRoles: UserRole | UserRole[]): boolean {
    const user = this.getUser();
    if (!user) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role);
  }

  setSession(token: string, user: AuthUser): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event("auth-changed"));
    } catch (err) {
      console.error("Failed to persist session to localStorage:", err);
    }
  }

  clearSession(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new Event("auth-changed"));
    } catch (err) {
      console.error("Failed to clear session from localStorage:", err);
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Login failed");
    }

    const data: AuthResponse = await res.json();
    this.setSession(data.token, data.user);
    return data;
  }

  async fetchMe(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.clearSession();
        }
        return null;
      }

      const { user } = await res.json();
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    } catch {
      return null;
    }
  }

  logout(): void {
    this.clearSession();
  }

  async createAccount(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    teacher_id?: string | null;
    class_id?: string | null;
  }): Promise<AuthUser> {
    const token = this.getToken();
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to create user account");
    }

    const resJson = await res.json();
    return resJson.user;
  }

  async listUsers(): Promise<AuthUser[]> {
    const token = this.getToken();
    const res = await fetch("/api/auth/users", {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || "Failed to fetch user accounts");
    }

    const resJson = await res.json();
    return resJson.data || [];
  }
}

export const authService = new AuthService();
