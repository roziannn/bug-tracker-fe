"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { STANDARD_ENVIRONMENTS } from "@/features/settings/data/environments";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { EnvVar } from "@/types";

const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const COLUMNS = 6;

type Draft = {
  id: number | null;
  label: string;
  key: string;
  value: string;
  isSecret: boolean;
  /** Variable lama yang sudah secret: value kosong berarti nilai lama dipertahankan. */
  wasSecret: boolean;
};

const emptyDraft: Draft = { id: null, label: "", key: "", value: "", isSecret: false, wasSecret: false };

async function request(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong, please try again.");
  return data;
}

export function EnvironmentSettingsPage() {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [extraEnvironments, setExtraEnvironments] = useState<string[]>([]);
  const [selectedEnv, setSelectedEnv] = useState(STANDARD_ENVIRONMENTS[0]);
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<EnvVar | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [envName, setEnvName] = useState("");
  const [copied, setCopied] = useState(false);

  const environmentNames = useMemo(() => {
    const byLowerCase = new Map<string, string>();
    for (const name of [...STANDARD_ENVIRONMENTS, ...vars.map((item) => item.Environment), ...extraEnvironments]) {
      if (!byLowerCase.has(name.toLowerCase())) byLowerCase.set(name.toLowerCase(), name);
    }
    return Array.from(byLowerCase.values());
  }, [extraEnvironments, vars]);

  const selectedVars = vars.filter((item) => item.Environment.toLowerCase() === selectedEnv.toLowerCase());

  const loadVars = useCallback(async () => {
    try {
      setVars((await request("/api/env", "GET")) as EnvVar[]);
    } catch (err) {
      appToast.error({ title: "Failed to load variables", description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadVars();
  }, [loadVars]);

  function forgetRevealed(id: number) {
    setRevealed((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function toggleReveal(item: EnvVar) {
    if (revealed[item.Id] !== undefined) {
      forgetRevealed(item.Id);
      return;
    }

    setRevealingId(item.Id);
    try {
      const data = await request(`/api/env/${item.Id}/value`, "GET");
      setRevealed((current) => ({ ...current, [item.Id]: data.value as string }));
    } catch (err) {
      appToast.error({ title: "Failed to load value", description: err instanceof Error ? err.message : undefined });
    } finally {
      setRevealingId(null);
    }
  }

  const normalizedKey = draft?.key.trim().toUpperCase() ?? "";
  const keyInvalid = draft !== null && normalizedKey !== "" && !KEY_PATTERN.test(normalizedKey);
  const keyDuplicate = draft !== null && selectedVars.some((item) => item.Id !== draft.id && item.Key === normalizedKey);
  const canSave = draft !== null && Boolean(normalizedKey) && !keyInvalid && !keyDuplicate && !saving;

  function openEdit(item: EnvVar) {
    setDraft({
      id: item.Id,
      label: item.Label,
      key: item.Key,
      value: item.Value ?? "",
      isSecret: item.IsSecret,
      wasSecret: item.IsSecret,
    });
  }

  async function saveVariable() {
    if (!draft || !canSave) return;

    setSaving(true);
    try {
      const fields = { label: draft.label.trim(), key: normalizedKey, isSecret: draft.isSecret };

      if (draft.id === null) {
        await request("/api/env", "POST", { ...fields, environment: selectedEnv, value: draft.value });
      } else {
        // Variable secret yang value-nya dikosongkan: jangan kirim value supaya nilai lama tetap.
        const keepValue = draft.wasSecret && draft.value === "";
        await request(`/api/env/${draft.id}`, "PUT", keepValue ? fields : { ...fields, value: draft.value });
        forgetRevealed(draft.id);
      }

      appToast.success({ title: draft.id === null ? "Variable added" : "Variable updated", description: normalizedKey });
      setDraft(null);
      await loadVars();
    } catch (err) {
      appToast.error({ title: "Failed to save variable", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete || deleting) return;
    const item = toDelete;

    setDeleting(true);
    try {
      await request(`/api/env/${item.Id}`, "DELETE");
      forgetRevealed(item.Id);
      appToast.success({ title: "Variable deleted", description: item.Key });
      setToDelete(null);
      await loadVars();
    } catch (err) {
      appToast.error({ title: "Failed to delete variable", description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeleting(false);
    }
  }

  const envNameTaken = environmentNames.some((name) => name.toLowerCase() === envName.trim().toLowerCase());

  function addEnvironment() {
    const name = envName.trim();
    if (!name || envNameTaken) return;

    setExtraEnvironments((current) => [...current, name]);
    setSelectedEnv(name);
    setEnvName("");
    setIsEnvDialogOpen(false);
  }

  async function copyEnv() {
    try {
      const data = await request(`/api/env/export?environment=${encodeURIComponent(selectedEnv)}`, "GET");
      await navigator.clipboard.writeText(data.text as string);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      appToast.error({ title: "Failed to copy .env", description: "Clipboard is not available in this browser." });
    }
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Environment Settings" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Environment settings</h2>
            <p className="text-sm text-muted-foreground">Manage environment variables (key and value) for each environment.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsEnvDialogOpen(true)}>
              <Plus />
              Add Environment
            </Button>
            <Button onClick={() => setDraft(emptyDraft)}>
              <KeyRound />
              Add Variable
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedEnv} onValueChange={(value) => value && setSelectedEnv(value)}>
            <SelectTrigger className="w-56" aria-label="Environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {environmentNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="ml-auto" onClick={copyEnv} disabled={!selectedVars.length}>
            <Copy />
            {copied ? "Copied" : "Copy .env"}
          </Button>
        </div>

        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loaded ? <TableSkeletonRows rows={5} columns={COLUMNS} /> : null}
                {loaded
                  ? selectedVars.map((item) => {
                      const shown = item.IsSecret ? revealed[item.Id] : (item.Value ?? "");
                      const hidden = item.IsSecret && shown === undefined;

                      return (
                        <TableRow key={item.Id}>
                          <TableCell className="font-medium">
                            {item.Label}
                            {item.IsSecret ? (
                              <Badge variant="outline" className="ml-2">
                                Secret
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.Key}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="flex items-center gap-2">
                              <span className={cn("truncate font-mono text-sm", hidden && "tracking-widest text-muted-foreground")}>
                                {hidden ? "••••••••" : shown || "-"}
                              </span>
                              {item.IsSecret ? (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={hidden ? `Show ${item.Key}` : `Hide ${item.Key}`}
                                  disabled={revealingId === item.Id}
                                  onClick={() => toggleReveal(item)}
                                >
                                  {hidden ? <Eye /> : <EyeOff />}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.CreatedBy || "System"}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(item.CreatedDate)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.Key}`} onClick={() => openEdit(item)}>
                                <Pencil />
                              </Button>
                              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${item.Key}`} onClick={() => setToDelete(item)}>
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  : null}
                {loaded && selectedVars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="py-8 text-center text-sm text-muted-foreground">
                      No variables in {selectedEnv} yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit variable" : "Add variable"}</DialogTitle>
            <DialogDescription>This variable applies to the {selectedEnv} environment.</DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="env-label" className="text-sm font-medium">
                  Label
                </label>
                <Input
                  id="env-label"
                  maxLength={100}
                  value={draft.label}
                  onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                  placeholder="Example: API Base URL"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="env-key" className="text-sm font-medium">
                  Key
                </label>
                <Input
                  id="env-key"
                  className="font-mono"
                  maxLength={100}
                  value={draft.key}
                  onChange={(event) => setDraft({ ...draft, key: event.target.value.toUpperCase() })}
                  placeholder="NEXT_PUBLIC_API_URL"
                />
                {keyInvalid ? (
                  <p className="text-xs text-destructive">Use uppercase letters, numbers, and underscores, starting with a letter.</p>
                ) : null}
                {keyDuplicate ? <p className="text-xs text-destructive">Key already exists in {selectedEnv}.</p> : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="env-value" className="text-sm font-medium">
                  Value
                </label>
                <Input
                  id="env-value"
                  className="font-mono"
                  type={draft.isSecret ? "password" : "text"}
                  autoComplete="off"
                  value={draft.value}
                  onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                  placeholder={draft.wasSecret ? "Leave empty to keep the current value" : "https://..."}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={draft.isSecret}
                  onChange={(event) => setDraft({ ...draft, isSecret: event.target.checked })}
                />
                Secret (value is hidden in the table)
              </label>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveVariable} disabled={!canSave}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete variable</DialogTitle>
            <DialogDescription>
              Delete {toDelete?.Key} from {toDelete?.Environment}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              <Trash2 />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEnvDialogOpen} onOpenChange={setIsEnvDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add environment</DialogTitle>
            <DialogDescription>
              A new environment starts without variables. It is saved once you add its first variable.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label htmlFor="env-name" className="text-sm font-medium">
              Environment name
            </label>
            <Input
              id="env-name"
              maxLength={50}
              value={envName}
              onChange={(event) => setEnvName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addEnvironment()}
              placeholder="Example: UAT"
            />
            {envNameTaken && envName.trim() ? <p className="text-xs text-destructive">This environment already exists.</p> : null}
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={addEnvironment} disabled={!envName.trim() || envNameTaken}>
              <Plus />
              Add environment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
