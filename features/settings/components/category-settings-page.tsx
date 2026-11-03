"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { getCategoryConfig } from "@/features/settings/data/category-store";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const COLUMNS = 6;

type Draft = { id: number | null; name: string; description: string };

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

export function CategorySettingsPage({ slug }: { slug: string }) {
  const config = getCategoryConfig(slug)!;
  const [items, setItems] = useState<Category[]>([]);
  // Slug yang datanya sudah termuat. Berbeda dari slug sekarang berarti sedang pindah kategori: tampilkan skeleton.
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const showSkeleton = loadedSlug !== slug;

  const loadItems = useCallback(async () => {
    try {
      setItems((await request(`/api/categories?category=${encodeURIComponent(slug)}`, "GET")) as Category[]);
    } catch (err) {
      appToast.error({ title: "Failed to load data", description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoadedSlug(slug);
    }
  }, [slug]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const duplicateName =
    draft !== null &&
    items.some((item) => item.Id !== draft.id && item.Name.toLowerCase() === draft.name.trim().toLowerCase());
  const canSave = draft !== null && draft.name.trim() !== "" && !duplicateName && !saving;

  async function saveDraft() {
    if (!draft || !canSave) return;

    setSaving(true);
    try {
      const payload = { name: draft.name.trim(), description: draft.description.trim() };
      await (draft.id === null
        ? request("/api/categories", "POST", { ...payload, category: slug })
        : request(`/api/categories/${draft.id}`, "PUT", payload));

      appToast.success({ title: draft.id === null ? "Item added" : "Item updated", description: payload.name });
      setDraft(null);
      await loadItems();
    } catch (err) {
      appToast.error({ title: "Failed to save item", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Category) {
    setBusyId(item.Id);
    try {
      await request(`/api/categories/${item.Id}`, "PATCH", { isActive: !item.IsActive });
      await loadItems();
    } catch (err) {
      appToast.error({ title: "Failed to update item", description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const item = toDelete;

    setBusyId(item.Id);
    try {
      await request(`/api/categories/${item.Id}`, "DELETE");
      appToast.success({ title: "Item deleted", description: item.Name });
      setToDelete(null);
      await loadItems();
    } catch (err) {
      appToast.error({ title: "Failed to delete item", description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Categories" }, { label: config.title }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <Button onClick={() => setDraft({ id: null, name: "", description: "" })}>
            <Plus />
            Add {config.title}
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? <TableSkeletonRows rows={5} columns={COLUMNS} /> : null}
              {(showSkeleton ? [] : items).map((item) => (
                <TableRow key={item.Id} className={cn(!item.IsActive && "opacity-60")}>
                  <TableCell className="font-medium">
                    {item.Name}
                    {!item.IsActive ? (
                      <Badge variant="outline" className="ml-2">
                        Inactive
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.Description || "-"}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.IsActive}
                      aria-label={`Activate ${item.Name}`}
                      disabled={busyId === item.Id}
                      onClick={() => toggleActive(item)}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors",
                        item.IsActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform",
                          item.IsActive && "translate-x-4"
                        )}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.CreatedBy || "System"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.CreatedDate)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${item.Name}`}
                        onClick={() => setDraft({ id: item.Id, name: item.Name, description: item.Description })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${item.Name}`}
                        disabled={busyId === item.Id}
                        onClick={() => setToDelete(item)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!showSkeleton && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-8 text-center text-muted-foreground">
                    No items yet. Click Add {config.title} to create one, or run <code>pnpm seed-category</code> to load the defaults.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? `Edit ${config.title}` : `Add ${config.title}`}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="category-name" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="category-name"
                  maxLength={100}
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
                {duplicateName ? <p className="text-xs text-destructive">Name is already used.</p> : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="category-description" className="text-sm font-medium">
                  Description
                </label>
                <Input
                  id="category-description"
                  maxLength={255}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveDraft} disabled={!canSave}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>
              Delete “{toDelete?.Name}” from {config.title}? This cannot be undone. To keep it but stop using it, switch it to inactive instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={confirmDelete} disabled={busyId !== null}>
              <Trash2 />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
