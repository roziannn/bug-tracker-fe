"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Save, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { requestJson } from "@/lib/request";
import { cn } from "@/lib/utils";
import type { Category, Paged, Team, User } from "@/types";

// id = NewId (GUID) group yang sedang diedit, null kalau membuat baru.
type Draft = { id: string | null; domainId: string | null; leadId: string | null };

const emptyDraft: Draft = { id: null, domainId: null, leadId: null };

export function TeamGroupsPage() {
  // null = masih dimuat
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [domains, setDomains] = useState<Category[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const isEditing = draft?.id != null;

  const loadTeams = useCallback(async () => {
    try {
      setTeams(await requestJson<Team[]>("/api/teams"));
    } catch (err) {
      setTeams([]);
      appToast.error({ title: "Failed to load group teams", description: err instanceof Error ? err.message : undefined });
    }
  }, []);

  useEffect(() => {
    loadTeams();

    requestJson<Paged<User>>("/api/users?pageSize=100")
      .then((body) => setUsers(body.data.filter((user) => user.IsActive)))
      .catch(() => {
        setUsers([]);
        appToast.error({ title: "Failed to load users", description: "Something went wrong, please try again." });
      });

    requestJson<Category[]>("/api/categories?category=teams-domain")
      .then(setDomains)
      .catch(() => {
        setDomains([]);
        appToast.error({ title: "Failed to load domains", description: "Something went wrong, please try again." });
      });
  }, [loadTeams]);

  // Satu group per domain: domain yang sudah dipakai group lain tidak ditawarkan lagi (kecuali milik group yang sedang diedit).
  const domainOptions = useMemo(() => {
    const takenByOthers = new Set((teams ?? []).filter((team) => team.NewId !== draft?.id).map((team) => team.DomainId));
    const ownDomain = (teams ?? []).find((team) => team.NewId === draft?.id)?.DomainId;

    return (domains ?? [])
      .filter((domain) => !takenByOthers.has(domain.Id) && (domain.IsActive || domain.Id === ownDomain))
      .map((domain) => ({ value: String(domain.Id), label: domain.Name }));
  }, [domains, draft?.id, teams]);

  const leadOptions = useMemo(() => {
    const options = (users ?? []).map((user) => ({
      value: String(user.Id),
      label: user.Name,
      description: user.RoleName ? `${user.Email} · ${user.RoleName}` : user.Email,
    }));

    // Lead saat ini tetap muncul walau akunnya sudah tidak aktif.
    const current = (teams ?? []).find((team) => team.NewId === draft?.id);
    if (current && users && !options.some((option) => option.value === String(current.LeadId))) {
      options.push({ value: String(current.LeadId), label: current.LeadName, description: "Inactive user" });
    }
    return options;
  }, [draft?.id, teams, users]);

  const canSave = draft !== null && draft.domainId !== null && draft.leadId !== null && !saving;

  function openCreate() {
    setDraft(emptyDraft);
  }

  function openEdit(team: Team) {
    setDraft({ id: team.NewId, domainId: String(team.DomainId), leadId: String(team.LeadId) });
  }

  async function saveDraft() {
    if (!draft || !canSave) return;

    setSaving(true);
    try {
      const payload = { domainId: Number(draft.domainId), leadId: Number(draft.leadId) };
      if (draft.id) await requestJson(`/api/teams/${draft.id}`, "PUT", payload);
      else await requestJson("/api/teams", "POST", payload);

      const domainName = domainOptions.find((option) => option.value === draft.domainId)?.label;
      appToast.success({ title: draft.id ? "Group team updated" : "Group team created", description: domainName });
      setDraft(null);
      await loadTeams();
    } catch (err) {
      appToast.error({ title: "Failed to save group team", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(team: Team) {
    setBusyId(team.NewId);
    try {
      await requestJson(`/api/teams/${team.NewId}`, "PATCH", { isActive: !team.IsActive });
      await loadTeams();
    } catch (err) {
      appToast.error({ title: "Failed to update group team", description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      activeNav="teams"
      breadcrumbs={[{ label: "Teams", href: "/teams" }, { label: "Manage Group Teams" }]}
      eyebrow="People & ownership"
      title="Manage Group Teams"
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Group team maintenance</h2>
            <p className="text-sm text-muted-foreground">
              Create, update, and review the group teams used for ownership and issue routing.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button nativeButton={false} render={<Link href="/teams" />} variant="outline">
              <ArrowLeft /> Back to teams
            </Button>
            <Button onClick={openCreate}>
              <Plus />
              Create group
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Existing group teams</CardTitle>
            <CardDescription>
              Each group team is tied to a Teams Domain. People are added from each team&apos;s own page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {teams === null
              ? [0, 1, 2].map((row) => <Skeleton key={row} className="h-[88px] w-full rounded-xl" aria-hidden="true" />)
              : null}

            {(teams ?? []).map((team) => (
              <div key={team.NewId} className={cn("rounded-xl border p-4", !team.IsActive && "opacity-60")}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{team.DomainName}</p>
                      <Badge variant="outline">
                        {team.MemberCount} {team.MemberCount === 1 ? "member" : "members"}
                      </Badge>
                      {!team.IsActive ? <Badge variant="outline">Inactive</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Lead: {team.LeadName} · Status: {team.IsActive ? "Active" : "Inactive"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created by {team.CreatedBy || "System"} · {formatDate(team.CreatedDate)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={team.IsActive}
                      aria-label={`Activate ${team.DomainName}`}
                      disabled={busyId === team.NewId}
                      onClick={() => toggleActive(team)}
                      className={cn(
                        "relative h-5 w-9 rounded-full transition-colors",
                        team.IsActive ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform",
                          team.IsActive && "translate-x-4"
                        )}
                      />
                    </button>
                    <Button onClick={() => openEdit(team)} variant="outline" size="icon" aria-label={`Edit ${team.DomainName}`}>
                      <Pencil />
                    </Button>
                    <Button nativeButton={false} render={<Link href={`/teams/${team.NewId}/members`} />}>
                      <Users />
                      Add people
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {teams !== null && teams.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No group teams yet. Click Create group to add one.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit group team" : "Create group team"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Change the domain or the lead of this group team."
                  : "Pick the domain this group team owns and who leads it."}
              </DialogDescription>
            </DialogHeader>

            {draft ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="team-domain">Domain</Label>
                  <Select
                    value={draft.domainId}
                    items={domainOptions}
                    disabled={domains === null}
                    onValueChange={(value) => setDraft({ ...draft, domainId: value })}
                  >
                    <SelectTrigger id="team-domain" className="w-full">
                      <SelectValue placeholder={domains === null ? "Loading domains..." : "Select a domain"} />
                    </SelectTrigger>
                    <SelectContent>
                      {domainOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {domains !== null && domainOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Every Teams Domain already has a group team. Add more in Settings → Categories → Teams Domain.
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="team-lead">Lead</Label>
                  <SearchSelect
                    id="team-lead"
                    options={leadOptions}
                    value={draft.leadId}
                    onValueChange={(value) => setDraft({ ...draft, leadId: value })}
                    placeholder={users === null ? "Loading users..." : "Search a user by name or email"}
                    emptyText="No users found."
                    disabled={users === null}
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter showCloseButton>
              <Button onClick={saveDraft} disabled={!canSave}>
                {isEditing ? <Save /> : <Plus />}
                {saving ? "Saving..." : isEditing ? "Save group" : "Create group"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
