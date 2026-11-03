"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { requestJson } from "@/lib/request";
import { cn } from "@/lib/utils";
import type { Category, Paged, Team, User } from "@/types";

const PAGE_SIZE = 10;
const COLUMNS = 7;
type Draft = { id: string | null; domainId: string | null; leadId: string | null; isActive: boolean };

export function TeamsPage() {
  // null = masih dimuat
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[] | null>(null);
  const [domains, setDomains] = useState<Category[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requestJson<Paged<User>>("/api/users?pageSize=100").then((body) => setUsers(body.data.filter((user) => user.IsActive))).catch(() => setUsers([]));
    requestJson<Category[]>("/api/categories?category=teams-domain").then(setDomains).catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    requestJson<Team[]>("/api/teams")
      .then(setTeams)
      .catch((err) => {
        setTeams([]);
        appToast.error({ title: "Failed to load teams", description: err instanceof Error ? err.message : undefined });
      });
  }, []);

  const loaded = teams !== null;
  const allTeams = useMemo(() => teams ?? [], [teams]);
  const totalPages = Math.max(1, Math.ceil(allTeams.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedTeams = allTeams.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const domainOptions = (domains ?? []).filter((domain) => !allTeams.some((team) => team.DomainId === domain.Id && team.NewId !== draft?.id) && (domain.IsActive || allTeams.some((team) => team.NewId === draft?.id && team.DomainId === domain.Id))).map((domain) => ({ value: String(domain.Id), label: domain.Name }));
  const currentTeam = allTeams.find((team) => team.NewId === draft?.id);
  const leadOptions = (users ?? []).map((user) => ({ value: String(user.Id), label: user.Name, description: user.RoleName ? `${user.Email} · ${user.RoleName}` : user.Email }));
  if (currentTeam && users && !leadOptions.some((option) => option.value === String(currentTeam.LeadId))) leadOptions.push({ value: String(currentTeam.LeadId), label: currentTeam.LeadName, description: "Inactive user" });

  async function saveDraft() {
    if (!draft || !draft.domainId || !draft.leadId || saving) return;
    setSaving(true);
    try {
      const payload = { domainId: Number(draft.domainId), leadId: Number(draft.leadId) };
      if (draft.id) {
        await requestJson(`/api/teams/${draft.id}`, "PUT", payload);
        if (currentTeam?.IsActive !== draft.isActive) await requestJson(`/api/teams/${draft.id}`, "PATCH", { isActive: draft.isActive });
      } else await requestJson("/api/teams", "POST", payload);
      appToast.success({ title: draft.id ? "Group team updated" : "Group team created" });
      setDraft(null);
      setTeams(await requestJson<Team[]>("/api/teams"));
    } catch (err) {
      appToast.error({ title: "Failed to save group team", description: err instanceof Error ? err.message : undefined });
    } finally { setSaving(false); }
  }

  return (
    <AppShell
      activeNav="teams"
      eyebrow="People & ownership"
      title="Teams"
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Group teams</h2>
            <p className="text-sm text-muted-foreground">See each group team, its lead and members, and manage them from here.</p>
          </div>

          <Button onClick={() => setDraft({ id: null, domainId: null, leadId: null, isActive: true })} size="lg"><Plus /> Create group</Button>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Team overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead>Team</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loaded ? <TableSkeletonRows rows={4} columns={COLUMNS} /> : null}
              {loaded
                ? paginatedTeams.map((team) => (
                    <TableRow key={team.NewId} className={cn(!team.IsActive && "opacity-60")}>
                      <TableCell className="font-semibold">{team.DomainName}</TableCell>
                      <TableCell>{team.LeadName}</TableCell>
                      <TableCell>
                        {team.MemberCount} {team.MemberCount === 1 ? "member" : "members"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={team.IsActive ? "secondary" : "outline"}>{team.IsActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{team.CreatedBy || "System"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(team.CreatedDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button nativeButton={false} render={<Link href={`/teams/${team.NewId}/members`} />} size="sm" variant="outline"><UserPlus className="mr-2 size-4" />Add member</Button>
                          <Button onClick={() => setDraft({ id: team.NewId, domainId: String(team.DomainId), leadId: String(team.LeadId), isActive: team.IsActive })} size="icon" variant="outline" aria-label={`Edit ${team.DomainName}`}><Pencil /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {loaded && paginatedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-10 text-center text-muted-foreground">
                    No group teams yet. Click Create group to add one.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedTeams.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, allTeams.length)} of {allTeams.length} teams
            </p>
            <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit group team" : "Create group team"}</DialogTitle><DialogDescription>{draft?.id ? "Change the domain, lead, or active status." : "Pick the domain this group team owns and who leads it."}</DialogDescription></DialogHeader>
          {draft ? <div className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="team-domain">Domain</Label><Select value={draft.domainId} items={domainOptions} disabled={domains === null} onValueChange={(value) => setDraft({ ...draft, domainId: value })}><SelectTrigger id="team-domain" className="w-full"><SelectValue placeholder={domains === null ? "Loading domains..." : "Select a domain"} /></SelectTrigger><SelectContent>{domainOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="team-lead">Lead</Label><SearchSelect id="team-lead" options={leadOptions} value={draft.leadId} onValueChange={(value) => setDraft({ ...draft, leadId: value })} placeholder={users === null ? "Loading users..." : "Search a user by name or email"} emptyText="No users found." disabled={users === null} /></div>
            {draft.id ? <div className="flex items-center justify-between"><Label htmlFor="team-active">Active</Label><button id="team-active" type="button" role="switch" aria-checked={draft.isActive} onClick={() => setDraft({ ...draft, isActive: !draft.isActive })} className={cn("relative h-5 w-9 rounded-full transition-colors", draft.isActive ? "bg-primary" : "bg-muted-foreground/30")}><span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform", draft.isActive && "translate-x-4")} /></button></div> : null}
          </div> : null}
          <DialogFooter showCloseButton><Button onClick={saveDraft} disabled={!draft?.domainId || !draft.leadId || saving || domains === null || users === null}>{draft?.id ? <Save /> : <Plus />}{saving ? "Saving..." : draft?.id ? "Save group" : "Create group"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
