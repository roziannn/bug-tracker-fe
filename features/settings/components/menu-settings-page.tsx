"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";

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
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import type { MenuNode } from "@/features/settings/data/access-catalog";
import { fetchMenus, orderMenus } from "@/features/settings/data/menu-store";
import { getMenuIcon, menuIcons, NO_ICON } from "@/features/settings/data/menu-icons";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

const ROOT = "none";
const COLUMNS = 8;

type Draft = {
  id: string | null;
  label: string;
  path: string;
  icon: string;
  parentId: string;
  actions: { id?: string; label: string }[];
};

// Path awal untuk sub menu: path parent + "/", supaya tinggal dilanjutkan (mis. "/settings/" lalu "menu").
function parentPathPrefix(parent: MenuNode | undefined) {
  if (!parent?.path) return "";
  return `${parent.path.replace(//+$/, "")}/`;
}

const emptyDraft: Draft = { id: null, label: "", path: "", icon: "Circle", parentId: ROOT, actions: [] };

export function MenuSettingsPage() {
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [buttonName, setButtonName] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MenuNode | null>(null);
  const rows = orderMenus(menus);
  const parents = menus.filter((menu) => !menu.parentId && menu.id !== draft?.id);
  // Menu yang sudah punya sub menu tidak bisa dijadikan sub menu.
  const draftHasChildren = draft?.id ? menus.some((menu) => menu.parentId === draft.id) : false;

  const loadMenus = useCallback(async () => {
    try {
      setMenus(await fetchMenus());
    } catch {
      appToast.error({ title: "Failed to load menus", description: "Something went wrong, please try again." });
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

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

  async function runAction(id: string, action: () => Promise<void>, failTitle: string) {
    setBusyId(id);
    try {
      await action();
      await loadMenus();
    } catch (err) {
      appToast.error({ title: failTitle, description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  function move(id: string, direction: -1 | 1) {
    return runAction(id, () => request(`/api/menus/${id}/move`, "POST", { direction }), "Failed to reorder menu");
  }

  function toggleVisible(menu: MenuNode) {
    return runAction(
      menu.id,
      () => request(`/api/menus/${menu.id}`, "PATCH", { visible: !menu.visible }),
      "Failed to update menu"
    );
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

  function changeParent(parentId: string) {
    if (!draft) return;

    const oldPrefix = parentPathPrefix(menus.find((menu) => menu.id === draft.parentId));
    const newPrefix = parentPathPrefix(menus.find((menu) => menu.id === parentId));
    const path = draft.path.trim();

    // Path hanya diganti kalau masih kosong atau masih berupa awalan parent lama (belum diketik sendiri).
    const untouched = path === "" || (oldPrefix !== "" && path === oldPrefix);
    setDraft({ ...draft, parentId, path: untouched ? newPrefix : draft.path });
  }

  function addDraftButton() {
    const name = buttonName.trim();
    if (!name || !draft) return;

    setDraft({ ...draft, actions: [...draft.actions, { label: name }] });
    setButtonName("");
  }

  async function saveDraft() {
    if (!draft || saving || !draft.label.trim()) return;

    setSaving(true);
    try {
      const payload = {
        label: draft.label.trim(),
        path: draft.path.trim(),
        icon: draft.icon,
        parentId: draft.parentId === ROOT ? null : draft.parentId,
        actions: draft.actions,
      };
      await (draft.id ? request(`/api/menus/${draft.id}`, "PUT", payload) : request("/api/menus", "POST", payload));

      appToast.success({ title: draft.id ? "Menu updated" : "Menu added", description: payload.label });
      setDraft(null);
      await loadMenus();
    } catch (err) {
      appToast.error({ title: "Failed to save menu", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const menu = toDelete;

    await runAction(
      menu.id,
      async () => {
        await request(`/api/menus/${menu.id}`, "DELETE");
        appToast.success({ title: "Menu deleted", description: menu.label });
      },
      "Failed to delete menu"
    );
    setToDelete(null);
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
              Manage sidebar menus: order, name, icon, buttons, and visibility.
            </p>
          </div>
          <Button
            onClick={() => {
              setButtonName("");
              setDraft(emptyDraft);
            }}
          >
            <Plus />
            Add Menu
          </Button>
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
                <TableHead>Buttons</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loaded ? <TableSkeletonRows rows={7} columns={COLUMNS} /> : null}
              {rows.map(({ menu, depth }) => {
                const Icon = getMenuIcon(menu.icon);
                const siblings = menus.filter((item) => item.parentId === menu.parentId);
                const position = siblings.indexOf(menu);
                const busy = busyId === menu.id;

                return (
                  <TableRow key={menu.id} className={cn(!menu.visible && "opacity-60")}>
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
                          aria-label="Move up"
                          disabled={busy || position === 0}
                          onClick={() => move(menu.id, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Move down"
                          disabled={busy || position === siblings.length - 1}
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
                        aria-label={`Show ${menu.label}`}
                        disabled={busy}
                        onClick={() => toggleVisible(menu)}
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
                    <TableCell className="text-muted-foreground">{menu.CreatedBy || "System"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {menu.CreatedDate ? formatDate(menu.CreatedDate) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${menu.label}`} onClick={() => openEdit(menu)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${menu.label}`}
                          disabled={busy}
                          onClick={() => setToDelete(menu)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {loaded && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-8 text-center text-muted-foreground">
                    No menus yet. Click Add Menu to create one, or run <code>pnpm seed-menu</code> to load the defaults.
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
            <DialogTitle>{draft?.id ? "Edit menu" : "Add menu"}</DialogTitle>
            <DialogDescription>Choose a parent to create a sub menu, and add the buttons available in this menu.</DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="menu-label" className="text-sm font-medium">
                  Name
                </label>
                <Input
                  id="menu-label"
                  maxLength={100}
                  value={draft.label}
                  onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Parent</label>
                <Select
                  value={draft.parentId}
                  disabled={draftHasChildren}
                  items={[{ value: ROOT, label: "No parent" }, ...parents.map((menu) => ({ value: menu.id, label: menu.label }))]}
                  onValueChange={(value) => changeParent(value ?? ROOT)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT}>No parent</SelectItem>
                    {parents.map((menu) => (
                      <SelectItem key={menu.id} value={menu.id}>
                        {menu.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draftHasChildren ? (
                  <p className="text-xs text-muted-foreground">This menu has sub menus, so it must stay a main menu.</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="menu-path" className="text-sm font-medium">
                  Path
                </label>
                <Input
                  id="menu-path"
                  value={draft.path}
                  onChange={(event) => setDraft({ ...draft, path: event.target.value })}
                  placeholder={draft.parentId === ROOT ? "/reports" : "Continue the parent path, e.g. /settings/menu"}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Icon</label>
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
                <label className="text-sm font-medium">Buttons</label>
                {draft.actions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {draft.actions.map((action, index) => (
                      <span key={action.id ?? `new-${index}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                        {action.label}
                        <button
                          type="button"
                          aria-label={`Remove ${action.label}`}
                          onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, i) => i !== index) })}
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
                    maxLength={100}
                    onChange={(event) => setButtonName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && addDraftButton()}
                    placeholder="Button name, e.g. Export"
                  />
                  <Button variant="outline" onClick={addDraftButton}>
                    <Plus />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveDraft} disabled={saving || !draft?.label.trim()}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete menu</DialogTitle>
            <DialogDescription>
              Delete “{toDelete?.label}”? Its sub menus and buttons will be deleted too. This cannot be undone.
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
