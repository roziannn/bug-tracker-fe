"use client";

import { usePathname } from "next/navigation";
import { useIdleLogout } from "@/hooks/use-idle-logout";

export function IdleLogoutWatcher() {
  const pathname = usePathname();
  // Di halaman login belum ada sesi, jadi refresh pasti 401 dan memicu logout berulang.
  useIdleLogout(pathname !== "/login");
  return null;
}
