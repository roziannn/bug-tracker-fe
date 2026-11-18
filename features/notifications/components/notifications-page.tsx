"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, CircleDot } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      setNotifications(await requestJson<Notification[]>("/api/notifications?all=true"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat notifikasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);

  async function markAllRead() {
    try {
      await requestJson("/api/notifications", "PATCH", { markAllRead: true });
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui notifikasi.");
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <AppShell activeNav="issues" title="Notifikasi" eyebrow="Updates" breadcrumbs={[{ label: "Notifikasi" }]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Semua notifikasi</h2><p className="text-sm text-muted-foreground">Notifikasi issue yang ditugaskan kepada Anda.</p></div>
          <Button type="button" variant="outline" onClick={() => void markAllRead()} disabled={unreadCount === 0}><CheckCheck />Tandai semua dibaca</Button>
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {loading ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Memuat notifikasi...</CardContent></Card> : notifications.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center"><Bell className="size-8 text-muted-foreground" /><p className="font-medium">Belum ada notifikasi</p><p className="text-sm text-muted-foreground">Notifikasi baru akan muncul di sini.</p></CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">{notifications.length} notifikasi</CardTitle><CardDescription>{unreadCount} belum dibaca</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {notifications.map((notification) => (
                <Link key={notification.id} href={notification.href} className={`flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 ${notification.isRead ? "" : "bg-muted/40"}`}>
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><CircleDot className="size-4" /></span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{notification.title}</span><Badge variant={notification.isRead ? "outline" : "secondary"}>{notification.isRead ? "Dibaca" : "Baru"}</Badge></span>
                    <span className="block text-sm text-muted-foreground">{notification.description}</span>
                    <span className="block text-xs text-muted-foreground">{new Date(notification.createdDate).toLocaleString()}</span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
