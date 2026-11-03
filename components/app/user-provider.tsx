"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { CurrentUser } from "@/types";

type UserContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  clearUser: () => void;
  refreshUser: () => Promise<void>;
  /** True kalau role user punya izin untuk button / function dengan code ini (contoh: "issues.create"). */
  hasAction: (code: string) => boolean;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  clearUser: () => {},
  refreshUser: async () => {},
  hasAction: () => false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      setUser(res.ok ? ((await res.json()) as CurrentUser) : null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  function clearUser() {
    setUser(null);
  }

  function hasAction(code: string) {
    return !!user?.actions.includes(code);
  }

  return (
    <UserContext.Provider value={{ user, isLoading, clearUser, refreshUser, hasAction }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
