"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type CurrentUser = {
  name: string;
  email: string;
};

type UserContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  clearUser: () => void;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  clearUser: () => {},
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      setUser(res.ok ? await res.json() : null);
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

  return (
    <UserContext.Provider value={{ user, isLoading, clearUser, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}