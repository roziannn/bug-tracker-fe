"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { ACCESS_LEVELS, ACCESS_LEVEL_LABELS, DEFAULT_ACCESS_LEVEL, type AccessLevel } from "@/features/teams/data/team-options";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { requestJson } from "@/lib/request";
import { cn } from "@/lib/utils";
import type { Paged, Team, TeamMember, User } from "@/types";

const PAGE_SIZE = 10;
const COLUMNS = 7;

// id = Id anggota yang sedang diedit, null kalau menambah baru.
type Draft = { id: number | null; name: string; userId: string | null; accessLevel: AccessLevel };

const emptyDraft: Draft = { id: null, name: "", userId: null, accessLevel: DEFAULT_ACCESS_LEVEL };

type TeamState = { status: "loading" } | { status: "notFound" } | { status: "error" } | { status: "ready"; team: Team };

// `id` adalah NewId (GUID) group team.
export function TeamMembersPage({ id }: { id: string }) {
  const [teamState, setTeamState] = useState<TeamState>({ status: "loading" });
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isEditing = draft?.id != null;

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await requestJson<TeamMember[]>(`/api/teams/${id}/members`));
    } catch (err) {
      setMembers([]);
      appToast.error({ title: "Failed to load members", description: err instanceof Error ? err.message : undefined });
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/teams/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) return { status: "notFound" } as const;
        if (!res.ok) return { status: "error" } as const;
        return { status: "ready", team: (await res.json()) as Team } as const;
      })
      .catch(() => ({ status: "error" }) as const)
      .then((next) => {
        if (!cancelled) setTeamState(next);
      });

    loadMembers();

    requestJson<Paged<User>>("/api/users?pageSize=100")
      .then((body) => setUsers(body.data.filter((user) => user.IsActive)))
      .catch(() => setUsers([]));

    return () => {
      cancelled = true;
    };
  }, [id, loadMembers]);

  // Orang yang sudah jadi anggota tidak ditawarkan lagi.
  const userOptions = useMemo(() => {
    const memberUserIds = new Set((members ?? []).map((member) => member.UserId));
    return (users ?? [])
      .filter((user) => !memberUserIds.has(user.Id))
      .map((user) => ({
        value: String(user.Id),
        label: user.Name,
        description: user.RoleName ? `${user.Email} · ${user.RoleName}` : user.Email,
      }));
  }, [members, users]);

  const loaded = members !== null;
  const allMembers = useMemo(() => members ?? [], [members]);
  const totalPages = Math.max(1, Math.ceil(allMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = allMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const team = teamState.status === "ready" ? teamState.team : null;
  const teamName = team?.DomainName ?? "";
  const canSave = draft !== null && (isEditing || draft.userId !== null) && !saving;

  async function saveDraft() {
    if (!draft || !canSave) return;

    setSaving(true);
    try {
      if (draft.id !== null) {
        await requestJson(`/api/teams/${id}/members/${draft.id}`, "PUT", { accessLevel: draft.accessLevel });
      } else {
        await requestJson(`/api/teams/${id}/members`, "POST", {
          userId: Number(draft.userId),
          accessLevel: draft.accessLevel,
        });
      }

      const name = draft.id !== null ? draft.name : userOptions.find((option) => option.value === draft.userId)?.label;
      appToast.success({ title: draft.id !== null ? "Member updated" : "Member added", description: name });
      setDraft(null);
      await loadMembers();
    } catch (err) {
      appToast.error({ title: "Failed to save member", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: TeamMember) {
    setBusyId(member.Id);
    try {
      await requestJson(`/api/teams/${id}/members/${member.Id}`, "PATCH", { isActive: !member.IsActive });
      await loadMembers();
    } catch (err) {
      appToast.error({ title: "Failed to update member", description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  if (teamState.status === "loading") {
    return (
      <AppShell
        activeNav="teams"
        breadcrumbs={[{ label: "Teams", href: "/teams" }, { label: "Add Members" }]}
        eyebrow="People & ownership"
        title="Add Members"
      >
        <Skeleton className="h-72 w-full rounded-xl" aria-hidden="true" />
      </AppShell>
    );
  }

  if (!team) {
    return (
      <AppShell
        activeNav="teams"
        breadcrumbs={[{ label: "Teams", href: "/teams" }, { label: "Team not found" }]}
        eyebrow="People & ownership"
        title="Team not found"
      >
        <Card>
          <CardHeader>
            <CardTitle>{teamState.status === "notFound" ? "Team not found" : "Failed to load team"}</CardTitle>
            <CardDescription>
              {teamState.status === "notFound"
                ? `There is no group team with id ${id}.`
                : "Something went wrong while loading this team, please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/teams" />} variant="outline">
              <ArrowLeft /> Back to teams
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeNav="teams"
      breadcrumbs={[{ label: "Teams", href: "/teams" }, { label: teamName }, { label: "Add Members" }]}
      eyebrow="People & ownership"
      title={`Add Members - ${teamName}`}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Add people to team</h2>
            <p className="text-sm text-muted-foreground">
              Adding people is separate from group team maintenance so roles and membership stay tidy.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button nativeButton={false} render={<Link href="/teams" />} variant="outline">
              <ArrowLeft /> Back to teams
            </Button>
            <Button onClick={() => setDraft(emptyDraft)}>
              <UserPlus /> Add member
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Access level</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created date</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loaded ? <TableSkeletonRows rows={4} columns={COLUMNS} /> : null}
                {loaded
                  ? paginatedMembers.map((member) => (
                      <TableRow key={member.Id} className={cn(!member.IsActive && "opacity-60")}>
                        <TableCell className="font-medium">{member.Name}</TableCell>
                        <TableCell className="text-muted-foreground">{member.Email}</TableCell>
                        <TableCell className="text-muted-foreground">{teamName}</TableCell>
                        <TableCell>{ACCESS_LEVEL_LABELS[member.AccessLevel as AccessLevel] ?? member.AccessLevel}</TableCell>
                        <TableCell className="text-muted-foreground">{member.CreatedBy || "System"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(member.CreatedDate)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={member.IsActive}
                            aria-label={`Activate ${member.Name}`}
                            disabled={busyId === member.Id}
                            onClick={() => toggleActive(member)}
                            className={cn(
                              "relative h-5 w-9 rounded-full transition-colors",
                              member.IsActive ? "bg-primary" : "bg-muted-foreground/30"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform",
                                member.IsActive && "translate-x-4"
                              )}
                            />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {loaded && paginatedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="py-10 text-center text-muted-foreground">
                      No members yet. Click Add member to add the first person.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedMembers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
                {Math.min(currentPage * PAGE_SIZE, allMembers.length)} of {allMembers.length} members
              </p>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>

        <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit member" : "Add member"}</DialogTitle>
              <DialogDescription>
                {isEditing ? `Update ${draft?.name}'s access level in ${teamName}.` : `Add a person to the ${teamName} team.`}
              </DialogDescription>
            </DialogHeader>

            {draft ? (
              <div className="grid gap-4">
                {isEditing ? (
                  <div className="grid gap-1">
                    <Label>Member</Label>
                    <p className="text-sm font-medium">{draft.name}</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="member-user">User</Label>
                    <SearchSelect
                      id="member-user"
                      options={userOptions}
                      value={draft.userId}
                      onValueChange={(value) => setDraft({ ...draft, userId: value })}
                      placeholder={users === null ? "Loading users..." : "Search a user by name or email"}
                      emptyText={users !== null && users.length > 0 ? "Everyone is already in this team." : "No users found."}
                      disabled={users === null}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="member-access">Access level</Label>
                  <Select
                    value={draft.accessLevel}
                    items={ACCESS_LEVELS.map((level) => ({ value: level, label: ACCESS_LEVEL_LABELS[level] }))}
                    onValueChange={(value) => setDraft({ ...draft, accessLevel: value as AccessLevel })}
                  >
                    <SelectTrigger className="w-full" id="member-access">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {ACCESS_LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            <DialogFooter showCloseButton>
              <Button onClick={saveDraft} disabled={!canSave}>
                {isEditing ? <Save /> : <UserPlus />}
                {saving ? "Saving..." : isEditing ? "Save member" : `Add to ${teamName}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
