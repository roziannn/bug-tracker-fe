"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

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
import {
  defaultItems,
  getCategoryConfig,
  loadCategoryItems,
  saveCategoryItems,
  type CategoryItem,
} from "@/features/settings/data/category-store";
import { cn } from "@/lib/utils";

type Draft = { id: string | null; name: string; description: string };

export function CategorySettingsPage({ slug }: { slug: string }) {
  const config = getCategoryConfig(slug)!;
  const [items, setItems] = useState<CategoryItem[]>(() => defaultItems(config));
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setItems(loadCategoryItems(config));
  }, [config]);

  function commit(next: CategoryItem[]) {
    setItems(next);
    saveCategoryItems(slug, next);
  }

  function saveDraft() {
    if (!draft) return;

    const name = draft.name.trim();
    const duplicate = items.some((item) => item.id !== draft.id && item.name.toLowerCase() === name.toLowerCase());
    if (!name || duplicate) return;

    const fields = { name, description: draft.description.trim() };
    commit(
      draft.id
        ? items.map((item) => (item.id === draft.id ? { ...item, ...fields } : item))
        : [...items, { id: `${slug}-${Date.now().toString(36)}`, active: true, ...fields }]
    );
    setDraft(null);
  }

  const duplicateName =
    draft !== null &&
    items.some((item) => item.id !== draft.id && item.name.toLowerCase() === draft.name.trim().toLowerCase());

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Kategori" }, { label: config.title }]}
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
            Tambah {config.title}
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={cn(!item.active && "opacity-60")}>
                  <TableCell className="font-medium">
                    {item.name}
                    {!item.active ? (
                      <Badge variant="outline" className="ml-2">
                        Nonaktif
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.active}
                      aria-label={`Aktifkan ${item.name}`}
                      onClick={() => commit(items.map((entry) => (entry.id === item.id ? { ...entry, active: !entry.active } : entry)))}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors",
                        item.active ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform",
                          item.active && "translate-x-4"
                        )}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => setDraft({ id: item.id, name: item.name, description: item.description })}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? `Edit ${config.title}` : `Tambah ${config.title}`}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="category-name" className="text-sm font-medium">
                  Nama
                </label>
                <Input
                  id="category-name"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
                {duplicateName ? <p className="text-xs text-destructive">Nama sudah dipakai.</p> : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="category-description" className="text-sm font-medium">
                  Deskripsi
                </label>
                <Input
                  id="category-description"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveDraft} disabled={!draft?.name.trim() || duplicateName}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
