"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, CircleDot } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { requestJson } from "@/lib/request";

type Notification = {
  id: number;
  issueId: string;
  title: string;
  description: string;
  href: string;
  isRead: boolean;
  createdDate: string;
};

function timeAgo(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  return `${Math.floor(hours / 24)}h lalu`;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const loadNotifications = useCallback(async () => {
    try {
      setNotifications(await requestJson<Notification[]>("/api/notifications"));
    } catch {
      // Notifications are an enhancement; keep the app shell usable if the endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 30_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  async function markAllRead() {
    try {
      await requestJson("/api/notifications", "PATCH", { markAllRead: true });
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    } catch {
      await loadNotifications();
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button aria-label="Notifications" className="relative" size="icon" variant="outline" />}>
        <Bell />
        {unreadCount > 0 ? <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <DropdownMenuLabel className="p-0 text-sm font-semibold text-foreground">Notifications</DropdownMenuLabel>
              <p className="text-xs text-muted-foreground">Update untuk issue yang ditugaskan ke Anda.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => void markAllRead()} disabled={unreadCount === 0}>
              <CheckCheck />Tandai dibaca
            </Button>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.length ? notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className={`items-start gap-3 rounded-xl p-3 ${notification.isRead ? "" : "bg-muted/60"}`} render={<Link href={notification.href} />}>
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><CircleDot className="size-4" /></span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-medium text-foreground">{notification.title}</p>
                  <Badge variant={notification.isRead ? "outline" : "secondary"}>{timeAgo(notification.createdDate)}</Badge>
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.description}</p>
              </div>
            </DropdownMenuItem>
          )) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <DropdownMenuItem className="justify-center rounded-xl py-2 font-medium text-primary" render={<Link href="/notifications" />}>Lihat semua notifikasi</DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
