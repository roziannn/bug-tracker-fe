"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, Database, HardDrive, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { appToast } from "@/lib/app-toast";
import { requestJson } from "@/lib/request";

type MonitoredDatabase = {
  id: string;
  name: string;
  provider: string;
  status: "online" | "offline";
  latencyMs: number | null;
  databaseName: string | null;
  serverVersion: string | null;
  activeConnections: number | null;
  maxConnections: number | null;
  sizeBytes: string | null;
  checkedAt: string;
  history: { checkedAt: string; latencyMs: number | null }[];
};

function formatBytes(value: string | null) {
  if (value === null) return "—";
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function DatabaseMonitorPage() {
  const [servers, setServers] = useState<MonitoredDatabase[]>([]);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("neon");
  const [connectionString, setConnectionString] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadServers = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      setServers(await requestJson<MonitoredDatabase[]>("/api/database-monitor"));
    } catch (error) {
      appToast.error({ title: "Gagal memuat database monitor", description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadServers(); }, [loadServers]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadServers(true);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [loadServers]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setProvider("neon");
    setConnectionString("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  async function saveServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isEditing = editingId !== null;
    setSaving(true);
    try {
      if (editingId) {
        await requestJson(`/api/database-monitor/${encodeURIComponent(editingId)}`, "PUT", { name, provider, connectionString });
        appToast.success({ title: "Database berhasil diperbarui" });
      } else {
        await requestJson("/api/database-monitor", "POST", { name, provider, connectionString });
        appToast.success({ title: "Database berhasil ditambahkan", description: "Koneksi berhasil diuji dan masuk ke monitor." });
      }
      setDialogOpen(false);
      resetForm();
      await loadServers(true);
    } catch (error) {
      appToast.error({ title: isEditing ? "Gagal memperbarui database" : "Gagal menambahkan database", description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function removeServer(server: MonitoredDatabase) {
    if (!window.confirm(`Hapus ${server.name} dari monitoring?`)) return;
    try {
      await requestJson(`/api/database-monitor/${encodeURIComponent(server.id)}`, "DELETE");
      setServers((current) => current.filter((item) => item.id !== server.id));
      appToast.success({ title: "Database dihapus dari monitor" });
    } catch (error) {
      appToast.error({ title: "Gagal menghapus database", description: error instanceof Error ? error.message : undefined });
    }
  }

  function beginEdit(server: MonitoredDatabase) {
    setEditingId(server.id);
    setName(server.name);
    setProvider(server.provider);
    setConnectionString("");
    setDialogOpen(true);
  }

  const onlineCount = servers.filter((server) => server.status === "online").length;

  return (
    <AppShell activeNav="settings" title="Database Monitor" eyebrow="Infrastructure" breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "Database Monitor" }]}>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="flex items-center gap-3 p-5"><Database className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Registered databases</p><p className="text-2xl font-semibold">{servers.length}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-5"><Activity className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Online</p><p className="text-2xl font-semibold">{onlineCount}</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-5"><HardDrive className="size-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Offline</p><p className="text-2xl font-semibold">{servers.length - onlineCount}</p></div></CardContent></Card>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Server terpantau</h2><p className="text-sm text-muted-foreground">Status dan metrik diperbarui otomatis setiap 30 detik.</p></div>
          <div className="flex items-center gap-2"><Button type="button" onClick={openCreateDialog}><Plus />Tambah database</Button><Button type="button" variant="outline" onClick={() => void loadServers(true)} disabled={refreshing}><RefreshCw className={refreshing ? "animate-spin" : ""} />Refresh</Button></div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit database" : "Tambahkan database"}</DialogTitle>
              <DialogDescription>{editingId ? "Connection URL dikosongkan berarti URL yang tersimpan tetap digunakan." : "Daftarkan PostgreSQL dari Neon, Supabase, atau server PostgreSQL lain."}</DialogDescription>
            </DialogHeader>
            <form id="database-monitor-form" className="grid gap-4" onSubmit={saveServer}>
              <div className="grid gap-2"><Label htmlFor="database-name">Nama server</Label><Input id="database-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Neon Production" maxLength={100} required /></div>
              <div className="grid gap-2"><Label htmlFor="database-provider">Provider</Label><select id="database-provider" value={provider} onChange={(event) => setProvider(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm"><option value="neon">Neon</option><option value="supabase">Supabase</option><option value="postgresql">PostgreSQL / Local</option></select></div>
              <div className="grid gap-2"><Label htmlFor="database-url">Connection URL{editingId ? " baru (opsional)" : ""}</Label><Input id="database-url" type="password" autoComplete="new-password" value={connectionString} onChange={(event) => setConnectionString(event.target.value)} placeholder={editingId ? "Kosongkan untuk mempertahankan URL saat ini" : "postgresql://user:password@host:5432/database?sslmode=require"} required={!editingId} />{!editingId ? <p className="text-xs text-muted-foreground">URL dienkripsi sebelum disimpan. Gunakan kredensial read-only bila tersedia.</p> : null}</div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Batal</Button>
              <Button type="submit" form="database-monitor-form" disabled={saving || !name.trim() || (!editingId && !connectionString.trim())}>{saving ? (editingId ? "Menyimpan..." : "Menguji koneksi...") : (editingId ? "Simpan perubahan" : "Tambah database")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? <p className="text-sm text-muted-foreground">Memuat status server...</p> : servers.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Belum ada database. Tambahkan koneksi untuk mulai memantau.</CardContent></Card>
        ) : <div className="grid gap-4 xl:grid-cols-2">
          {servers.map((server) => <Card key={server.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1"><CardTitle className="text-base">{server.name}</CardTitle><CardDescription>{server.provider} · {server.databaseName ?? "Database tidak tersedia"}{server.id === "application-database" ? " · dari DATABASE_URL" : ""}</CardDescription></div>
              <div className="flex items-center gap-2"><Badge variant={server.status === "online" ? "secondary" : "destructive"}>{server.status === "online" ? "Online" : "Offline"}</Badge>{server.id !== "application-database" ? <><Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit ${server.name}`} onClick={() => beginEdit(server)}><Pencil /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label={`Hapus ${server.name}`} onClick={() => void removeServer(server)}><Trash2 /></Button></> : null}</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-28 w-full">
                {server.history.some((sample) => sample.latencyMs !== null) ? <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={server.history} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                    <defs><linearGradient id={`latency-fill-${server.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.32} /><stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} /></linearGradient></defs>
                    <XAxis dataKey="checkedAt" hide /><YAxis hide domain={[0, "auto"]} />
                    <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleTimeString()} formatter={(value) => [`${value} ms`, "Latency"]} />
                    <Area type="monotone" dataKey="latencyMs" stroke="#16a34a" strokeWidth={2} fill={`url(#latency-fill-${server.id})`} connectNulls={false} dot={{ r: 2, fill: "#16a34a" }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Belum ada data latency dalam 24 jam terakhir.</div>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><p className="text-muted-foreground">Latency</p><p className="font-medium">{server.latencyMs === null ? "—" : `${server.latencyMs} ms`}</p></div>
              <div><p className="text-muted-foreground">Connections</p><p className="font-medium">{server.activeConnections === null ? "—" : `${server.activeConnections} / ${server.maxConnections}`}</p></div>
              <div><p className="text-muted-foreground">Database size</p><p className="font-medium">{formatBytes(server.sizeBytes)}</p></div>
              <div><p className="text-muted-foreground">PostgreSQL</p><p className="font-medium">{server.serverVersion ?? "—"}</p></div>
              <p className="col-span-full text-xs text-muted-foreground">Checked {new Date(server.checkedAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>)}
        </div>}
      </div>
    </AppShell>
  );
}
