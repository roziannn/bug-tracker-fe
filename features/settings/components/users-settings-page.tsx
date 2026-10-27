"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import type { Paged, Role, User } from "@/types";

const PAGE_SIZE = 10;

export function UsersSettingsPage() {
  const [users, setUsers] = useState<Paged<User> | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const totalPages = Math.max(1, Math.ceil((users?.total ?? 0) / PAGE_SIZE));

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search });
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error();
      setUsers(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Gagal memuat users.");
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetch("/api/roles?pageSize=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: Paged<Role> | null) => setRoles(body?.data ?? []))
      .catch(() => setRoles([]));
  }, []);

  async function createUser() {
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, roleId: Number(roleId) }),
      });

      if (!res.ok) {
        setFormError((await res.json().catch(() => null))?.error ?? "Gagal membuat user.");
        return;
      }

      setName("");
      setEmail("");
      setPassword("");
      setRoleId("");
      setIsDialogOpen(false);
      await loadUsers();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Users" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Users</h2>
            <p className="text-sm text-muted-foreground">Buat user baru dan tentukan role-nya.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button />}>
              <Plus />
              Tambah User
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah user</DialogTitle>
                <DialogDescription>User bisa login memakai email dan password ini.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="user-name" className="text-sm font-medium">
                    Nama
                  </label>
                  <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="user-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="user-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="user-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.Id} value={String(role.Id)}>
                          {role.Name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              </div>

              <DialogFooter showCloseButton>
                <Button onClick={createUser} disabled={submitting}>
                  <Plus />
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Card>
        <CardContent className="space-y-4">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama atau email"
            className="max-w-sm"
          />

          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users?.data ?? []).map((user) => (
                <TableRow key={user.Id}>
                  <TableCell className="font-medium">{user.Name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.Email}</TableCell>
                  <TableCell>
                    <Badge variant={user.IsActive ? "secondary" : "outline"}>{user.IsActive ? "Aktif" : "Nonaktif"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.CreatedDate).toLocaleDateString("id-ID")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{users?.total ?? 0} users</p>
            <TablePagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
