"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, ShieldCheck } from "lucide-react";

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
import { TablePagination } from "@/components/ui/table-pagination";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { defaultMenus, type MenuNode } from "@/features/settings/data/access-catalog";
import { loadMenus } from "@/features/settings/data/menu-store";
import { loadRoles, saveRoles, type RoleAccess } from "@/features/settings/data/role-access-store";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Paged, Role } from "@/types";

const PAGE_SIZE = 5;


type Draft ={ id: number | null; name: string; isActive: boolean; originalName: string };

export function RoleSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [access, setAccess] = useState<RoleAccess[]>([]);
  const [menus, setMenus] = useState<MenuNode[]>(defaultMenus);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const totalActions = menus.reduce((sum, menu) => sum + menu.actions.length, 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  // Skeleton tampil saat pertama kali memuat dan saat pindah halaman, bukan saat refresh setelah simpan.
  const showSkeleton = loadedPage !== page;

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/roles?page=${page}&pageSize=${PAGE_SIZE}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const body = (await res.json()) as Paged<Role>;
      setRoles(body.data);
      setTotal(body.total);
    } catch {
      appToast.error({ title: "Failed to load roles", description: "Something went wrong, please try again." });
    } finally {
      setLoadedPage(page);
    }
  }, [page]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    setAccess(loadRoles());
    setMenus(loadMenus());
  }, []);

  async function saveDraft() {
    if (!draft || saving) return;
    const name = draft.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      const res = await fetch(draft.id ? `/api/roles/${draft.id}` : "/api/roles", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isActive: draft.isActive }),
      });
      const body = await res.json();

      if (!res.ok) {
        appToast.error({ title: "Failed to save role", description: body.error ?? "Something went wrong, please try again." });
        return;
      }

      // Akses menu/button masih disimpan per nama role, jadi ikut dipindahkan saat nama berubah.
      if (draft.id && draft.originalName !== name) {
        const next = loadRoles().map((item) => (item.name === draft.originalName ? { ...item, name } : item));
        saveRoles(next);
        setAccess(next);
      }

      appToast.success({ title: draft.id ? "Role updated" : "Role added", description: name });
      setDraft(null);
      await fetchRoles();
    } catch {
      appToast.error({ title: "Failed to save role", description: "Something went wrong, please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Role" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Role settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage roles, then set the active menus and buttons from each role's access page.
            </p>
          </div>

          <Button onClick={() => setDraft({ id: null, name: "", isActive: true, originalName: "" })}>
            <Plus />
            Add Role
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Menus</TableHead>
                <TableHead>Buttons</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? <TableSkeletonRows rows={PAGE_SIZE} columns={6} /> : null}
              {(showSkeleton ? [] : roles).map((role) => {
                const roleAccess = access.find((item) => item.name === role.Name);
                const menuCount = (roleAccess?.menus ?? ["overview"]).filter((id) =>
                  menus.some((menu) => menu.id === id)
                ).length;
                const actionCount = (roleAccess?.actions ?? []).filter((id) =>
                  menus.some((menu) => menu.actions.some((action) => action.id === id))
                ).length;

                return (
                  <TableRow key={role.Id} className={cn(!role.IsActive && "opacity-60")}>
                    <TableCell className="font-medium">
                      {role.Name}
                      {!role.IsActive ? (
                        <Badge variant="outline" className="ml-2">
                          Inactive
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {menuCount} / {menus.length}
                    </TableCell>
                    <TableCell>
                      {actionCount} / {totalActions}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{role.CreatedBy || "System"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(role.CreatedDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${role.Name}`}
                          onClick={() =>
                            setDraft({ id: role.Id, name: role.Name, isActive: role.IsActive, originalName: role.Name })
                          }
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/settings/role/${encodeURIComponent(role.Name)}`} />}
                        >
                          <ShieldCheck />
                          Configure access
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!showSkeleton && roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No roles yet. Click Add Role to create one.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {roles.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {(currentPage - 1) * PAGE_SIZE + roles.length} of {total} roles
            </p>
            <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit role" : "Add new role"}</DialogTitle>
            <DialogDescription>Menu and button access can be set from Configure access.</DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="role-name" className="text-sm font-medium">
                  Role name
                </label>
                <Input
                  id="role-name"
                  value={draft.name}
                  maxLength={100}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Example: Product Manager"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.isActive}
                  aria-label="Activate role"
                  onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
                  className={cn(
                    "relative h-5 w-9 rounded-full transition-colors",
                    draft.isActive ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform",
                      draft.isActive && "translate-x-4"
                    )}
                  />
                </button>
              </div>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button onClick={saveDraft} disabled={!draft?.name.trim() || saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
