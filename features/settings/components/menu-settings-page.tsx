"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
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
import { defaultMenus, type MenuNode } from "@/features/settings/data/access-catalog";
import { loadMenus, orderMenus, saveMenus, slugify } from "@/features/settings/data/menu-store";
import { getMenuIcon, menuIcons, NO_ICON } from "@/features/settings/data/menu-icons";
import { cn } from "@/lib/utils";

const ROOT = "none";

type Draft = {
  id: string | null;
  label: string;
  path: string;
  icon: string;
  parentId: string;
  actions: MenuNode["actions"];
};

const emptyDraft: Draft = { id: null, label: "", path: "", icon: "Circle", parentId: ROOT, actions: [] };

export function MenuSettingsPage() {
  const [menus, setMenus] = useState<MenuNode[]>(defaultMenus);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [buttonName, setButtonName] = useState("");
  const rows = orderMenus(menus);
  const parents = menus.filter((menu) => !menu.parentId && menu.id !== draft?.id);

  useEffect(() => {
    setMenus(loadMenus());
  }, []);

  function commit(next: MenuNode[]) {
    setMenus(next);
    saveMenus(next);
  }

  function move(id: string, direction: -1 | 1) {
    const current = menus.find((menu) => menu.id === id);
    if (!current) return;

    const siblings = menus.filter((menu) => menu.parentId === current.parentId);
    const target = siblings[siblings.indexOf(current) + direction];
    if (!target) return;

    const next = [...menus];
    const a = next.indexOf(current);
    const b = next.indexOf(target);
    [next[a], next[b]] = [next[b], next[a]];
    commit(next);
  }

  function toggleVisible(id: string) {
    commit(menus.map((menu) => (menu.id === id ? { ...menu, visible: !menu.visible } : menu)));
  }

  function removeMenu(id: string) {
    commit(menus.filter((menu) => menu.id !== id && menu.parentId !== id));
  }

  function openEdit(menu: MenuNode) {
    setButtonName("");
    setDraft({
      id: menu.id,
      label: menu.label,
      path: menu.path,
      icon: menu.icon,
      parentId: menu.parentId ?? ROOT,
      actions: menu.actions,
    });
  }

  function addDraftButton() {
    const name = buttonName.trim();
    if (!name || !draft) return;

    setDraft({ ...draft, actions: [...draft.actions, { id: `${draft.id ?? "new"}.${slugify(name)}`, label: name }] });
    setButtonName("");
  }

  function saveDraft() {
    if (!draft || !draft.label.trim()) return;

    const parentId = draft.parentId === ROOT ? null : draft.parentId;
    const fields = { label: draft.label.trim(), path: draft.path.trim(), icon: draft.icon, parentId, actions: draft.actions };

    commit(
      draft.id
        ? menus.map((menu) => (menu.id === draft.id ? { ...menu, ...fields } : menu))
        : [...menus, { id: slugify(draft.label), visible: true, ...fields }]
    );
    setDraft(null);
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Menu" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Menu</h2>
            <p className="text-sm text-muted-foreground">
              Atur menu di sidebar: urutan, nama, ikon, button, dan tampil atau tidaknya.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => commit(defaultMenus)}>
              <RotateCcw />
              Reset Default
            </Button>
            <Button
              onClick={() => {
                setButtonName("");
                setDraft(emptyDraft);
              }}
            >
              <Plus />
              Tambah Menu
            </Button>
          </div>
        </div>
      }
    >
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Button</TableHead>
                <TableHead>Urutan</TableHead>
                <TableHead>Tampil</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ menu, depth }) => {
                const Icon = getMenuIcon(menu.icon);
                const siblings = menus.filter((item) => item.parentId === menu.parentId);
                const position = siblings.indexOf(menu);

                return (
                  <TableRow key={menu.id}>
                    <TableCell>
                      <div className={cn("flex items-center gap-3 font-medium", depth && "pl-8")}>
                        {Icon ? (
                          <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                            <Icon className="size-4" />
                          </span>
                        ) : null}
                        {menu.label}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">{menu.path || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{menu.actions.length}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Naik"
                          disabled={position === 0}
                          onClick={() => move(menu.id, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Turun"
                          disabled={position === siblings.length - 1}
                          onClick={() => move(menu.id, 1)}
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={menu.visible}
                        aria-label={`Tampilkan ${menu.label}`}
                        onClick={() => toggleVisible(menu.id)}
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          menu.visible ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform",
                            menu.visible && "translate-x-4"
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${menu.label}`} onClick={() => openEdit(menu)}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${menu.label}`} onClick={() => removeMenu(menu.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit menu" : "Tambah menu"}</DialogTitle>
            <DialogDescription>Pilih parent untuk membuat sub menu, dan tambahkan button yang tersedia di menu ini.</DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="menu-label" className="text-sm font-medium">
                  Nama
                </label>
                <Input id="menu-label" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <label htmlFor="menu-path" className="text-sm font-medium">
                  Path
                </label>
                <Input id="menu-path" value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} placeholder="/reports" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Ikon</label>
                  <Select value={draft.icon} onValueChange={(value) => setDraft({ ...draft, icon: value ?? "Circle" })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ICON}>None</SelectItem>
                      {Object.keys(menuIcons).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Parent</label>
                  <Select value={draft.parentId} onValueChange={(value) => setDraft({ ...draft, parentId: value ?? ROOT })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT}>Tanpa parent</SelectItem>
                      {parents.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          {menu.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Button</label>
                {draft.actions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {draft.actions.map((action) => (
                      <span key={action.id} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                        {action.label}
                        <button
                          type="button"
                          aria-label={`Hapus ${action.label}`}
                          onClick={() => setDraft({ ...draft, actions: draft.actions.filter((item) => item.id !== action.id) })}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Input
                    value={buttonName}
                    onChange={(event) => setButtonName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addDraftButton()}
                    placeholder="Nama button, mis. Export"
                  />
                  <Button variant="outline" onClick={addDraftButton}>
                    <Plus />
                    Tambah
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveDraft}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
