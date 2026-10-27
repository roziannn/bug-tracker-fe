"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MenuNode } from "@/features/settings/data/access-catalog";
import { defaultMenus } from "@/features/settings/data/access-catalog";
import { loadMenus, orderMenus, saveMenus, slugify } from "@/features/settings/data/menu-store";

const ROOT = "none";

export function MenuSettingsPage() {
  const [menus, setMenus] = useState<MenuNode[]>(defaultMenus);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [parentId, setParentId] = useState(ROOT);
  const [buttonDrafts, setButtonDrafts] = useState<Record<string, string>>({});
  const parents = menus.filter((menu) => !menu.parentId);

  useEffect(() => {
    setMenus(loadMenus());
  }, []);

  function commit(next: MenuNode[]) {
    setMenus(next);
    saveMenus(next);
  }

  function addMenu() {
    const name = label.trim();
    if (!name) return;

    commit([...menus, { id: slugify(name), label: name, parentId: parentId === ROOT ? null : parentId, actions: [] }]);
    setLabel("");
    setParentId(ROOT);
    setIsDialogOpen(false);
  }

  function removeMenu(id: string) {
    commit(menus.filter((menu) => menu.id !== id && menu.parentId !== id));
  }

  function addButton(menuId: string) {
    const name = (buttonDrafts[menuId] ?? "").trim();
    if (!name) return;

    commit(
      menus.map((menu) =>
        menu.id === menuId ? { ...menu, actions: [...menu.actions, { id: `${menuId}.${slugify(name)}`, label: name }] } : menu
      )
    );
    setButtonDrafts((current) => ({ ...current, [menuId]: "" }));
  }

  function removeButton(menuId: string, actionId: string) {
    commit(
      menus.map((menu) =>
        menu.id === menuId ? { ...menu, actions: menu.actions.filter((action) => action.id !== actionId) } : menu
      )
    );
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Menu" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Menu settings</h2>
          <p className="text-sm text-muted-foreground">
            Buat parent menu dan sub menu, lalu tambahkan button di tiap menu. Akses per role diatur di halaman Role.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus />
              Add Menu
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add menu</DialogTitle>
                <DialogDescription>Kosongkan parent untuk membuat parent menu, atau pilih parent untuk sub menu.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="menu-label" className="text-sm font-medium">
                    Menu name
                  </label>
                  <Input id="menu-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Contoh: Reports" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Parent menu</label>
                  <Select value={parentId} onValueChange={(value) => setParentId(value ?? ROOT)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT}>No parent (top level)</SelectItem>
                      {parents.map((menu) => (
                        <SelectItem key={menu.id} value={menu.id}>
                          {menu.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter showCloseButton>
                <Button onClick={addMenu}>
                  <Plus />
                  Add menu
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {orderMenus(menus).map(({ menu, depth }) => (
          <Card key={menu.id} className={depth ? "ml-6 sm:ml-10" : undefined}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {menu.label}
                    <Badge variant={depth ? "outline" : "secondary"}>{depth ? "Sub menu" : "Parent"}</Badge>
                  </CardTitle>
                  <CardDescription>{menu.actions.length} button</CardDescription>
                </div>
                <Button variant="outline" size="icon-sm" aria-label={`Delete ${menu.label}`} onClick={() => removeMenu(menu.id)}>
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {menu.actions.length ? (
                <div className="flex flex-wrap gap-2">
                  {menu.actions.map((action) => (
                    <Badge key={action.id} variant="outline" className="gap-1">
                      {action.label}
                      <button
                        type="button"
                        aria-label={`Remove ${action.label}`}
                        onClick={() => removeButton(menu.id, action.id)}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Input
                  value={buttonDrafts[menu.id] ?? ""}
                  onChange={(event) => setButtonDrafts((current) => ({ ...current, [menu.id]: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && addButton(menu.id)}
                  placeholder="Nama button, mis. Export"
                />
                <Button variant="outline" onClick={() => addButton(menu.id)}>
                  <Plus />
                  Add button
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
