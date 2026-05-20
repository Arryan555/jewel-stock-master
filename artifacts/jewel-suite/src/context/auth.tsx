import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AuthRole = "super_admin" | "jeweller";

export interface AuthUser {
  role: AuthRole;
  id: string;
  name: string;
  loginId: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (loginId: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const SESSION_KEY = "jewel-session";
const ADMIN_CREDS_KEY = "jewel-admin-creds";
const SUBSCRIBERS_KEY = "jewel-subscribers";

export function getAdminCreds(): { loginId: string; password: string } {
  try {
    const raw = localStorage.getItem(ADMIN_CREDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { loginId: "admin", password: "admin@1234" };
}

export function saveAdminCreds(creds: { loginId: string; password: string }) {
  localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(creds));
}

export interface Subscriber {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  plan: "monthly" | "quarterly" | "half-yearly" | "annual" | "biennial";
  loginId: string;
  password: string;
  amcStart: string;
  amcEnd: string;
  active: boolean;
  createdAt: string;
}

export function loadSubscribers(): Subscriber[] {
  try {
    const raw = localStorage.getItem(SUBSCRIBERS_KEY);
    if (raw) return JSON.parse(raw) as Subscriber[];
  } catch { /* ignore */ }
  return [];
}

export function saveSubscribers(list: Subscriber[]) {
  localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(list));
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const login = (loginId: string, password: string): { ok: boolean; error?: string } => {
    const trimId = loginId.trim();
    const trimPw = password.trim();

    // Check admin credentials
    const adminCreds = getAdminCreds();
    if (trimId === adminCreds.loginId && trimPw === adminCreds.password) {
      const u: AuthUser = { role: "super_admin", id: "admin", name: "Super Admin", loginId: trimId };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    }

    // Check subscriber credentials
    const subscribers = loadSubscribers();
    const sub = subscribers.find(s => s.loginId === trimId && s.password === trimPw && s.active);
    if (sub) {
      const u: AuthUser = { role: "jeweller", id: sub.id, name: sub.shopName, loginId: sub.loginId };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    }

    return { ok: false, error: "Invalid login ID or password" };
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === "super_admin",
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
