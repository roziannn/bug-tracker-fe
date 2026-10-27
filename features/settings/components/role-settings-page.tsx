"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { defaultMenus, type MenuNode } from "@/features/settings/data/access-catalog";
import { loadMenus } from "@/features/settings/data/menu-store";
import { defaultRoles, loadRoles, saveRoles, type RoleAccess } from "@/features/settings/data/role-access-store";

const PAGE_SIZE = 5;

export function RoleSettingsPage() {
  const [roles, setRoles] = useState<RoleAccess[]>(defaultRoles);
  const [menus, setMenus] = useState<MenuNode[]>(defaultMenus);
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const totalActions = menus.reduce((sum, menu) => sum + menu.actions.length, 0);
  const totalPages = Math.max(1, Math.ceil(roles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRoles = useMemo(
    () => roles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, roles]
  );

  useEffect(() => {
    setRoles(loadRoles());
    setMenus(loadMenus());
  }, []);

  function createRole() {
    const name = roleName.trim();
    if (!name || roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    const next = [...roles, { name, menus: ["overview"], actions: [] }];
    setRoles(next);
    saveRoles(next);
    setRoleName("");
    setIsCreateDialogOpen(false);
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Role" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Role settings</h2>
            <p className="text-sm text-muted-foreground">
              Kelola role, lalu atur menu dan button yang aktif lewat halaman access masing-masing role.
            </p>
          </div>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Pilih Configure access untuk mengatur menu dan button per role.</CardDescription>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger render={<Button />}>
                <Plus />
                Add Role
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add new role</DialogTitle>
                  <DialogDescription>Akses menu dan button bisa diatur setelah role dibuat.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <label htmlFor="role-name" className="text-sm font-medium">
                    Role name
                  </label>
                  <Input
                    id="role-name"
                    value={roleName}
                    onChange={(event) => setRoleName(event.target.value)}
                    placeholder="Contoh: Product Manager"
                  />
                </div>
                <DialogFooter showCloseButton>
                  <Button onClick={createRole}>
                    <Plus />
                    Add role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Menus</TableHead>
                <TableHead>Buttons</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRoles.map((role) => (
                <TableRow key={role.name}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    {role.menus.filter((id) => menus.some((menu) => menu.id === id)).length} / {menus.length}
                  </TableCell>
                  <TableCell>
                    {role.actions.filter((id) => menus.some((menu) => menu.actions.some((action) => action.id === id))).length} / {totalActions}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/settings/role/${encodeURIComponent(role.name)}`} />}
                    >
                      <ShieldCheck />
                      Configure access
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedRoles.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, roles.length)} of {roles.length} roles
            </p>
            <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
