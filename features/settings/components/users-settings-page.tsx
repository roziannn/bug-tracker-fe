"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { formatDate } from "@/lib/date";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { appToast } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import type { Paged, Role, User } from "@/types";

const PAGE_SIZE = 10;

type Draft = { id: number | null; name: string; email: string; password: string; roleId: string; isActive: boolean };

const emptyDraft: Draft = { id: null, name: "", email: "", password: "", roleId: "", isActive: true };

export function UsersSettingsPage() {
  const [users, setUsers] = useState<Paged<User> | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const totalPages = Math.max(1, Math.ceil((users?.total ?? 0) / PAGE_SIZE));
  // Skeleton tampil saat pertama kali memuat dan saat pindah halaman, bukan saat mengetik di pencarian.
  const showSkeleton = !loadError && (users === null || users.page !== page);

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), search });
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error();
      setUsers(await res.json());
      setLoadError("");
    } catch {
      setLoadError("Failed to load users.");
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

  function openDialog(next: Draft) {
    setFormError("");
    setDraft(next);
  }

  async function saveUser() {
    if (!draft) return;
    setSubmitting(true);
    setFormError("");

    try {
      const isEdit = draft.id !== null;
      const payload: Record<string, unknown> = {
        name: draft.name,
        email: draft.email,
        roleId: Number(draft.roleId),
        isActive: draft.isActive,
      };
      // Saat edit, password kosong berarti tidak diganti.
      if (!isEdit || draft.password) payload.password = draft.password;

      const res = await fetch(isEdit ? `/api/users/${draft.id}` : "/api/users", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setFormError((await res.json().catch(() => null))?.error ?? "Failed to save user.");
        return;
      }

      appToast.success({ title: isEdit ? "User updated" : "User added", description: draft.name });
      setDraft(null);
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
            <p className="text-sm text-muted-foreground">Create new users and assign their roles.</p>
          </div>

          <Button onClick={() => openDialog(emptyDraft)}>
            <Plus />
            Add User
          </Button>
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
            placeholder="Search name or email"
            className="max-w-sm"
          />

          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? <TableSkeletonRows rows={PAGE_SIZE} columns={7} /> : null}
              {(showSkeleton ? [] : (users?.data ?? [])).map((user) => (
                <TableRow key={user.Id} className={cn(!user.IsActive && "opacity-60")}>
                  <TableCell className="font-medium">{user.Name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.Email}</TableCell>
                  <TableCell>{user.RoleName ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={user.IsActive ? "secondary" : "outline"}>{user.IsActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.CreatedBy || "System"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.CreatedDate)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${user.Name}`}
                      onClick={() =>
                        openDialog({
                          id: user.Id,
                          name: user.Name,
                          email: user.Email,
                          password: "",
                          roleId: user.RoleId ? String(user.RoleId) : "",
                          isActive: user.IsActive,
                        })
                      }
                    >
                      <Pencil />
                    </Button>
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

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {draft?.id
                ? "Leave the password empty to keep the current one."
                : "The user can sign in with this email and password."}
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="user-name" className="text-sm font-medium">
                  Name
                </label>
                <Input id="user-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <label htmlFor="user-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="user-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="user-password" className="text-sm font-medium">
                  {draft.id ? "New password (optional)" : "Password"}
                </label>
                <Input
                  id="user-password"
                  type="password"
                  value={draft.password}
                  onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={draft.roleId}
                  items={roles.map((role) => ({ value: String(role.Id), label: role.Name }))}
                  onValueChange={(value) => setDraft({ ...draft, roleId: value ?? "" })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
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
              {draft.id ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.isActive}
                    aria-label="Activate user"
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
              ) : null}
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button
              onClick={saveUser}
              disabled={submitting || !draft?.name.trim() || !draft?.email.trim() || !draft?.roleId}
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
