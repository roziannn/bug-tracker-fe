"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { accessCatalog } from "@/features/settings/data/access-catalog";
import { defaultRoles, loadRoles, saveRoles, type RoleAccess } from "@/features/settings/data/role-access-store";
import { SettingsSubnav } from "@/features/settings/components/settings-subnav";

function toggle(list: string[], id: string, enabled: boolean) {
  return enabled ? [...list.filter((item) => item !== id), id] : list.filter((item) => item !== id);
}

export function RoleAccessPage({ roleName }: { roleName: string }) {
  const [role, setRole] = useState<RoleAccess | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const found = loadRoles().find((item) => item.name === roleName) ?? defaultRoles.find((item) => item.name === roleName);
    setRole(found ?? null);
    setNotFound(!found);
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
            <p className="text-sm text-muted-foreground">Aktifkan menu, lalu pilih button yang boleh dipakai role ini.</p>
          </div>
          <SettingsSubnav />
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
            <CardContent className="py-8 text-sm text-muted-foreground">Role “{roleName}” tidak ditemukan.</CardContent>
          </Card>
        ) : null}

        {role
          ? accessCatalog.map((menu) => {
              const menuEnabled = role.menus.includes(menu.id);

              return (
                <Card key={menu.id}>
                  <CardHeader>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-primary"
                        checked={menuEnabled}
                        onChange={(event) => setMenu(menu.id, event.target.checked)}
                      />
                      <span>
                        <CardTitle>{menu.label}</CardTitle>
                        <CardDescription>
                          {menuEnabled ? "Menu aktif untuk role ini." : "Menu disembunyikan dari role ini."}
                        </CardDescription>
                      </span>
                    </label>
                  </CardHeader>
                  {menu.actions.length ? (
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      {menu.actions.map((action) => (
                        <label
                          key={action.id}
                          className={`flex items-center gap-2 text-sm ${menuEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
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
                    </CardContent>
                  ) : null}
                </Card>
              );
            })
          : null}
      </div>
    </AppShell>
  );
}
