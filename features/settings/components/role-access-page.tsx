"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { useCurrentUser } from "@/components/app/user-provider";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import type { MenuNode } from "@/features/settings/data/access-catalog";
import { fetchMenus, orderMenus } from "@/features/settings/data/menu-store";
import { appToast } from "@/lib/app-toast";
import type { Paged, Role, RoleAccess } from "@/types";

function toggle(list: string[], id: string, enabled: boolean) {
  return enabled ? [...list.filter((item) => item !== id), id] : list.filter((item) => item !== id);
}

export function RoleAccessPage({ roleName }: { roleName: string }) {
  const { refreshUser } = useCurrentUser();
  const [role, setRole] = useState<Role | null>(null);
  const [access, setAccess] = useState<RoleAccess>({ menus: [], actions: [] });
  const [menus, setMenus] = useState<MenuNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [allMenus, roles] = await Promise.all([
          fetchMenus(),
          fetch(`/api/roles?pageSize=100&search=${encodeURIComponent(roleName)}`, { cache: "no-store" }).then(
            (res) => res.json() as Promise<Paged<Role>>
          ),
        ]);
        setMenus(allMenus);

        const found = roles.data?.find((item) => item.Name === roleName) ?? null;
        setRole(found);

        if (found) {
          const res = await fetch(`/api/roles/${found.Id}/access`, { cache: "no-store" });
          if (res.ok) setAccess((await res.json()) as RoleAccess);
        }
      } catch {
        appToast.error({ title: "Failed to load access", description: "Something went wrong, please try again." });
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, [roleName]);

  function setMenu(menuId: string, enabled: boolean) {
    setAccess((current) => ({ ...current, menus: toggle(current.menus, menuId, enabled) }));
  }

  function setAction(actionId: string, enabled: boolean) {
    setAccess((current) => ({ ...current, actions: toggle(current.actions, actionId, enabled) }));
  }

  async function save() {
    if (!role || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${role.Id}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(access),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        appToast.error({ title: "Failed to save access", description: body?.error ?? "Something went wrong, please try again." });
        return;
      }

      setAccess(body as RoleAccess);
      appToast.success({ title: "Access saved", description: roleName });
      // Kalau yang diubah adalah role milik user yang sedang login, sidebar-nya ikut diperbarui.
      await refreshUser();
    } catch {
      appToast.error({ title: "Failed to save access", description: "Something went wrong, please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Role", href: "/settings/role" }, { label: roleName }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Access: {roleName}</h2>
            <p className="text-sm text-muted-foreground">
              Enable a menu, then choose which buttons this role can use. A sub menu only shows in the sidebar when its
              parent menu is enabled too.
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" nativeButton={false} render={<Link href="/settings/role" />}>
            <ArrowLeft />
            Back to roles
          </Button>
          <Button onClick={save} disabled={!role || saving}>
            <Save />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>

        {loaded && !role ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Role “{roleName}” not found.</CardContent>
          </Card>
        ) : null}

        {!loaded || role ? (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Menu Name</TableHead>
                    <TableHead>Parent Menu</TableHead>
                    <TableHead>Sequence</TableHead>
                    <TableHead>Function Buttons</TableHead>
                    <TableHead className="text-right">Menu Access</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loaded ? <TableSkeletonRows rows={7} columns={5} /> : null}
                  {orderMenus(menus).map(({ menu, depth }) => {
                    const menuEnabled = access.menus.includes(menu.id);
                    const parent = menus.find((item) => item.id === menu.parentId);
                    const sequence = menus.filter((item) => item.parentId === menu.parentId).indexOf(menu) + 1;

                    return (
                      <TableRow key={menu.id}>
                        <TableCell style={depth ? { paddingLeft: 8 + depth * 24 } : undefined}>{menu.label}</TableCell>
                        <TableCell className="text-muted-foreground">{parent?.label ?? "-"}</TableCell>
                        <TableCell>{sequence}</TableCell>
                        <TableCell>
                          {menu.actions.length ? (
                            <div className="flex flex-wrap gap-2">
                              {menu.actions.map((action) => (
                                <label
                                  key={action.id}
                                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                                    menuEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    disabled={!menuEnabled}
                                    checked={menuEnabled && access.actions.includes(action.id)}
                                    onChange={(event) => setAction(action.id, event.target.checked)}
                                  />
                                  {action.label}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No buttons</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <label className="flex cursor-pointer items-center justify-end gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={menuEnabled}
                              onChange={(event) => setMenu(menu.id, event.target.checked)}
                            />
                            {menuEnabled ? "Enabled" : "Disabled"}
                          </label>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {loaded && menus.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No menus yet. Add menus in Settings → Menu first.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
