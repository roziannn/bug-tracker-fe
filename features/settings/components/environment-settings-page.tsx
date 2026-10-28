"use client";

import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

type EnvironmentStatus = "Active" | "Synced" | "Protected";

type EnvVariable = {
  id: string;
  label: string;
  key: string;
  value: string;
  secret: boolean;
};

type Environment = {
  id: string;
  name: string;
  status: EnvironmentStatus;
  variables: EnvVariable[];
};

const STORAGE_KEY = "bug-tracker:environments";
const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;

function variable(label: string, key: string, value: string, secret = false): EnvVariable {
  return { id: `${key}-${Math.random().toString(36).slice(2, 8)}`, label, key, value, secret };
}

const initialEnvironments: Environment[] = [
  {
    id: "development",
    name: "Development",
    status: "Active",
    variables: [
      variable("API Base URL", "NEXT_PUBLIC_API_URL", "http://localhost:3000/api"),
      variable("Database URL", "DATABASE_URL", "postgres://dev:dev@localhost:5432/bugtracker", true),
      variable("JWT Secret", "JWT_SECRET", "dev-only-secret", true),
    ],
  },
  {
    id: "staging",
    name: "Staging",
    status: "Synced",
    variables: [
      variable("API Base URL", "NEXT_PUBLIC_API_URL", "https://staging.bugtracker.internal/api"),
      variable("Database URL", "DATABASE_URL", "postgres://staging:change-me@db.staging.internal:5432/bugtracker", true),
      variable("JWT Secret", "JWT_SECRET", "change-me", true),
    ],
  },
  {
    id: "production",
    name: "Production",
    status: "Protected",
    variables: [
      variable("API Base URL", "NEXT_PUBLIC_API_URL", "https://bugtracker.company.com/api"),
      variable("Database URL", "DATABASE_URL", "postgres://prod:change-me@db.internal:5432/bugtracker", true),
      variable("JWT Secret", "JWT_SECRET", "change-me", true),
    ],
  },
];

function statusVariant(status: EnvironmentStatus) {
  if (status === "Active") return "default";
  if (status === "Protected") return "destructive";
  return "secondary";
}

type VariableDraft = Omit<EnvVariable, "id"> & { id: string | null };

const emptyVariable: VariableDraft = { id: null, label: "", key: "", value: "", secret: false };

export function EnvironmentSettingsPage() {
  const [environments, setEnvironments] = useState<Environment[]>(initialEnvironments);
  const [selectedId, setSelectedId] = useState(initialEnvironments[0].id);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [variableDraft, setVariableDraft] = useState<VariableDraft | null>(null);
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [envName, setEnvName] = useState("");
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus>("Active");
  const [copied, setCopied] = useState(false);
  const selected = environments.find((environment) => environment.id === selectedId) ?? environments[0];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEnvironments(JSON.parse(raw) as Environment[]);
    } catch {
      // ignore unreadable storage and keep defaults
    }
  }, []);

  function commit(next: Environment[]) {
    setEnvironments(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable; changes stay in memory only
    }
  }

  function patchSelected(patch: Partial<Environment>) {
    commit(environments.map((environment) => (environment.id === selected.id ? { ...environment, ...patch } : environment)));
  }

  const normalizedKey = variableDraft?.key.trim().toUpperCase() ?? "";
  const keyInvalid = variableDraft !== null && normalizedKey !== "" && !KEY_PATTERN.test(normalizedKey);
  const keyDuplicate =
    variableDraft !== null &&
    selected.variables.some((item) => item.id !== variableDraft.id && item.key === normalizedKey);
  const canSaveVariable = variableDraft !== null && Boolean(normalizedKey) && !keyInvalid && !keyDuplicate;

  function saveVariable() {
    if (!variableDraft || !canSaveVariable) return;

    const fields = {
      label: variableDraft.label.trim() || normalizedKey,
      key: normalizedKey,
      value: variableDraft.value,
      secret: variableDraft.secret,
    };

    patchSelected({
      variables: variableDraft.id
        ? selected.variables.map((item) => (item.id === variableDraft.id ? { ...item, ...fields } : item))
        : [...selected.variables, { id: `${normalizedKey}-${Date.now().toString(36)}`, ...fields }],
    });
    setVariableDraft(null);
  }

  function createEnvironment() {
    const name = envName.trim();
    if (!name || environments.some((environment) => environment.name.toLowerCase() === name.toLowerCase())) return;

    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
    commit([...environments, { id, name, status: envStatus, variables: [] }]);
    setSelectedId(id);
    setEnvName("");
    setEnvStatus("Active");
    setIsEnvDialogOpen(false);
  }

  async function copyEnv() {
    const text = selected.variables.map((item) => `${item.key}=${item.value}`).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
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
            <p className="text-sm text-muted-foreground">
              Kelola environment variable (key dan value) untuk setiap environment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsEnvDialogOpen(true)}>
              <Plus />
              Add Environment
            </Button>
            <Button onClick={() => setVariableDraft(emptyVariable)}>
              <KeyRound />
              Add Variable
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selected.id} onValueChange={(value) => value && setSelectedId(value)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {environments.map((environment) => (
                <SelectItem key={environment.id} value={environment.id}>
                  {environment.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selected.status} onValueChange={(value) => value && patchSelected({ status: value as EnvironmentStatus })}>
            <SelectTrigger className="w-40" aria-label="Environment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Synced">Synced</SelectItem>
              <SelectItem value="Protected">Protected</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant={statusVariant(selected.status)}>{selected.status}</Badge>
          <Button variant="outline" className="ml-auto" onClick={copyEnv} disabled={!selected.variables.length}>
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.variables.length ? (
                  selected.variables.map((item) => {
                    const hidden = item.secret && !revealed[item.id];

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.label}
                          {item.secret ? (
                            <Badge variant="outline" className="ml-2">
                              Secret
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.key}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="flex items-center gap-2">
                            <span className={cn("truncate font-mono text-sm", hidden && "tracking-widest text-muted-foreground")}>
                              {hidden ? "••••••••" : item.value || "-"}
                            </span>
                            {item.secret ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={hidden ? `Show ${item.key}` : `Hide ${item.key}`}
                                onClick={() => setRevealed((current) => ({ ...current, [item.id]: !current[item.id] }))}
                              >
                                {hidden ? <Eye /> : <EyeOff />}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.key}`} onClick={() => setVariableDraft({ ...item })}>
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Hapus ${item.key}`}
                              onClick={() => {
                                if (window.confirm(`Hapus variable ${item.key} dari ${selected.name}?`)) {
                                  patchSelected({ variables: selected.variables.filter((entry) => entry.id !== item.id) });
                                }
                              }}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada variable di {selected.name}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={variableDraft !== null} onOpenChange={(open) => !open && setVariableDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{variableDraft?.id ? "Edit variable" : "Add variable"}</DialogTitle>
            <DialogDescription>Variable ini berlaku untuk environment {selected.name}.</DialogDescription>
          </DialogHeader>

          {variableDraft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="env-label" className="text-sm font-medium">
                  Label
                </label>
                <Input
                  id="env-label"
                  value={variableDraft.label}
                  onChange={(event) => setVariableDraft({ ...variableDraft, label: event.target.value })}
                  placeholder="Contoh: API Base URL"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="env-key" className="text-sm font-medium">
                  Key
                </label>
                <Input
                  id="env-key"
                  className="font-mono"
                  value={variableDraft.key}
                  onChange={(event) => setVariableDraft({ ...variableDraft, key: event.target.value.toUpperCase() })}
                  placeholder="NEXT_PUBLIC_API_URL"
                />
                {keyInvalid ? (
                  <p className="text-xs text-destructive">Gunakan huruf besar, angka, dan underscore, diawali huruf.</p>
                ) : null}
                {keyDuplicate ? <p className="text-xs text-destructive">Key sudah ada di {selected.name}.</p> : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="env-value" className="text-sm font-medium">
                  Value
                </label>
                <Input
                  id="env-value"
                  className="font-mono"
                  type={variableDraft.secret ? "password" : "text"}
                  value={variableDraft.value}
                  onChange={(event) => setVariableDraft({ ...variableDraft, value: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={variableDraft.secret}
                  onChange={(event) => setVariableDraft({ ...variableDraft, secret: event.target.checked })}
                />
                Secret (value disembunyikan di tabel)
              </label>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveVariable} disabled={!canSaveVariable}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEnvDialogOpen} onOpenChange={setIsEnvDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add environment</DialogTitle>
            <DialogDescription>Environment baru dimulai tanpa variable.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="env-name" className="text-sm font-medium">
                Nama environment
              </label>
              <Input id="env-name" value={envName} onChange={(event) => setEnvName(event.target.value)} placeholder="Contoh: UAT" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={envStatus} onValueChange={(value) => value && setEnvStatus(value as EnvironmentStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Synced">Synced</SelectItem>
                  <SelectItem value="Protected">Protected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={createEnvironment} disabled={!envName.trim()}>
              <Plus />
              Add environment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
