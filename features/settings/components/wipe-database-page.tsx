"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Database, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appToast } from "@/lib/app-toast";
import { WIPEABLE_DATA_TABLES, type WipeableDataTable } from "@/features/settings/data/wipe-database-tables";

type WipeTable = (typeof WIPEABLE_DATA_TABLES)[number] & { rowCount: number };

async function loadTables(): Promise<WipeTable[]> {
  const response = await fetch("/api/settings/wipe-database", { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Failed to load application tables");
  return data.tables as WipeTable[];
}

export function WipeDatabasePage() {
  const [tables, setTables] = useState<WipeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTable, setPendingTable] = useState<WipeTable | null>(null);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wiping, setWiping] = useState(false);

  const refreshTables = useCallback(async () => {
    try {
      setTables(await loadTables());
    } catch (error) {
      appToast.error({ title: "Failed to load tables", description: error instanceof Error ? error.message : undefined });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTables();
  }, [refreshTables]);

  function openWipeDialog(tableName: WipeableDataTable) {
    const table = tables.find((item) => item.name === tableName);
    if (!table) return;
    setConfirmation("");
    setEmail("");
    setPassword("");
    setPendingTable(table);
  }

  async function wipeTable() {
    if (!pendingTable || confirmation !== pendingTable.name || !email.trim() || !password) return;
    setWiping(true);
    try {
      const response = await fetch("/api/settings/wipe-database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: pendingTable.name, confirmation, email, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "The table could not be wiped");
      appToast.success({ title: "Table wiped", description: `${pendingTable.name}: ${data.deletedCount} row(s) deleted.` });
      setPendingTable(null);
      setReauthOpen(false);
      setConfirmation("");
      setEmail("");
      setPassword("");
      await refreshTables();
    } catch (error) {
      appToast.error({ title: "Failed to wipe table", description: error instanceof Error ? error.message : undefined });
    } finally {
      setWiping(false);
    }
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Wipe Database" }]}
      eyebrow="Database maintenance"
      title="Wipe Database"
      toolbar={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Application data tables</h2>
          <p className="text-sm text-muted-foreground">Review row counts and wipe a selected table.</p>
        </div>
      }
    >
      <div className="grid gap-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-1">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <div className="grid gap-1">
              <p className="font-semibold">Destructive action</p>
              <p className="text-sm text-muted-foreground">
                Wiping a table permanently deletes its rows. Related rows may also be deleted by database cascade rules. <strong className="font-semibold text-foreground">Core users, roles, menus, and settings are excluded.</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="size-4" />Application tables</CardTitle>
            <CardDescription>Only application data tables are available here. Every wipe is recorded in the audit trail.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell className="min-w-56">
                        <p className="font-medium">{table.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">{table.name}</p>
                      </TableCell>
                      <TableCell className="min-w-64 text-sm text-muted-foreground">{table.description}</TableCell>
                      <TableCell className="text-right tabular-nums"><Badge variant="secondary">{loading ? "…" : table.rowCount}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="destructive" disabled={loading || wiping} onClick={() => openWipeDialog(table.name)}>
                          <Trash2 />Wipe
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && !tables.length ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No application tables are available.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pendingTable !== null && !reauthOpen} onOpenChange={(open) => {
        if (!open && !wiping) {
          setPendingTable(null);
          setConfirmation("");
          setEmail("");
          setPassword("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wipe {pendingTable?.label}?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-foreground">
                This permanently deletes {pendingTable?.rowCount ?? 0} row(s) from <span className="font-mono text-destructive">{pendingTable?.name}</span>. Related records may also be deleted by cascade rules. This cannot be undone.
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="wipe-table-confirmation">Type the exact table name to confirm</Label>
            <Input id="wipe-table-confirmation" autoComplete="off" spellCheck={false} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={wiping} onClick={() => {
              setPendingTable(null);
              setConfirmation("");
              setEmail("");
              setPassword("");
            }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={wiping || !pendingTable || confirmation !== pendingTable.name} onClick={() => setReauthOpen(true)}>
              <Trash2 />Wipe table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reauthOpen} onOpenChange={(open) => {
        setReauthOpen(open);
        if (!open && !wiping) setPassword("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify your account</DialogTitle>
            <DialogDescription>Enter the email and password for the account you are currently signed in with to wipe {pendingTable?.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="wipe-account-email">Email</Label>
              <Input id="wipe-account-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wipe-account-password">Password</Label>
              <Input id="wipe-account-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={wiping} onClick={() => {
              setReauthOpen(false);
              setPassword("");
            }}>Back</Button>
            <Button type="button" variant="destructive" disabled={wiping || !pendingTable || !email.trim() || !password} onClick={() => void wipeTable()}>
              <Trash2 />{wiping ? "Wiping…" : "Verify and wipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
