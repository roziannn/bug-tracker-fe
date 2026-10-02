"use client";

import { useIdleLogout } from "@/hooks/use-idle-logout";

export function IdleLogoutWatcher() {
  useIdleLogout();
  return null;
}