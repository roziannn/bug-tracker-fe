"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const REFRESH_THROTTLE_MS = 60 * 1000; 
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export function useIdleLogout() {
  const router = useRouter();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    async function logout() {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    }

    function resetIdleTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(logout, IDLE_TIMEOUT_MS);
    }

    async function handleActivity() {
      resetIdleTimer();

      const now = Date.now();
      if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) return;
      lastRefreshRef.current = now;

      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) {
          await logout();
        }
      } catch {
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));
    resetIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [router]);
}