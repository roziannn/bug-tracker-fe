"use client";

// import { useIdleLogout } from "@/hooks/use-idle-logout";

export function IdleLogoutWatcher() {
  // TEMP: dinonaktifkan sementara selama auth dimatikan (tidak ada session,
  // sehingga /api/auth/refresh 401 dan memicu logout ke /login).
  // useIdleLogout();
  return null;
}
