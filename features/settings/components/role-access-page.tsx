"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { defaultMenus, type MenuNode } from "@/features/settings/data/access-catalog";
import { loadMenus, orderMenus } from "@/features/settings/data/menu-store";
import { defaultRoles, loadRoles, saveRoles, type RoleAccess } from "@/features/settings/data/role-access-store";

function toggle(list: string[], id: string, enabled: boolean) {
  return enabled ? [...list.filter((item) => item !== id), id] : list.filter((item) => item !== id);
}

export function RoleAccessPage({ roleName }: { roleName: string }) {
  const [role, setRole] = useState<RoleAccess | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [menus, setMenus] = useState<MenuNode[]>(defaultMenus);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMenus(loadMenus());

    // Role berasal dari database; akses menu/button-nya masih disimpan di browser per nama role.
    async function load() {
      let exists = false;
      try {
        const res = await fetch(`/api/roles?pageSize=100&search=${encodeURIComponent(roleName)}`, { cache: "no-store" });
        const body = (await res.json()) as { data?: { Name: string }[] };
        exists = !!body.data?.some((item) => item.Name === roleName);
      } catch {
        exists = false;
      }

      const found = loadRoles().find((item) => item.name === roleName) ?? defaultRoles.find((item) => item.name === roleName);
      setRole(exists ? (found ?? { name: roleName, menus: ["overview"], actions: [] }) : null);
      setNotFound(!exists);
    }

    load();
  }, [roleName]);

  function setMenu(menuId: string, enabled: boolean) {
    setSaved(false);
    setRole((current) => (current ? { ...current, menus: toggle(current.menus, menuId, enabled) } : current));
  }

  function setAction(actionId: string, enabled: boolean) {
    setSaved(false);
    setRole((current) => (current ? { ...current, actions: toggle(current.actions, actionId, enabled) } : current));
  }

  function save() {
    if (!role) return;
    const roles = loadRoles();
    saveRoles(roles.some((item) => item.name === role.name) ? roles.map((item) => (item.name === role.name ? role : item)) : [...roles, role]);
    setSaved(true);
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
            <p className="text-sm text-muted-foreground">Enable a menu, then choose which buttons this role can use.</p>
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
          <div className="flex items-center gap-3">
            {saved ? <span className="text-sm text-muted-foreground">Saved</span> : null}
            <Button onClick={save} disabled={!role}>
              <Save />
              Save changes
            </Button>
          </div>
        </div>

        {notFound ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Role “{roleName}” not found.</CardContent>
          </Card>
        ) : null}

        {role ? (
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
                  {orderMenus(menus).map(({ menu, depth }) => {
                    const menuEnabled = role.menus.includes(menu.id);
                    const parent = menus.find((item) => item.id === menu.parentId);
                    const sequence = menus.filter((item) => item.parentId === menu.parentId).indexOf(menu) + 1;

                    return (
                      <TableRow key={menu.id}>
                        <TableCell className={depth ? "pl-10" : undefined}>{menu.label}</TableCell>
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
                                    checked={menuEnabled && role.actions.includes(action.id)}
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
