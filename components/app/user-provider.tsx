"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type CurrentUser = {
  name: string;
  email: string;
};

type UserContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  clearUser: () => void;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  isLoading: true,
  clearUser: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  function clearUser() {
    setUser(null);
  }

  return (
    <UserContext.Provider value={{ user, isLoading, clearUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}