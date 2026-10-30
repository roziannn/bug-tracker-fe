"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Edit, Edit2, Pencil, Save, UserPlus } from "lucide-react";
import { formatDate } from "@/lib/date";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { getTeamById, picOptions } from "@/features/bug-tracker/data/bug-tracker-data";

const PAGE_SIZE = 4;
const roleOptions = ["Admin", "Lead", "Engineer", "QA"] as const;
const accessLevelOptions = ["member", "lead", "observer"] as const;
const DEFAULT_ADMIN = "administrator@bugtracker.app";

type TeamMemberRecord = {
  id: string;
  name: string;
  email: string;
  team: string;
  role: (typeof roleOptions)[number];
  accessLevel: (typeof accessLevelOptions)[number];
  createdBy: string;
  createdAt: string;
  isActive: "active" | "inactive";
};

export function TeamMembersPage({ id }: { id: string }) {
  const team = getTeamById(id);
  const initialTeamName = team?.name ?? "";
  const [page, setPage] = useState(1);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<(typeof roleOptions)[number]>("Engineer");
  const [accessLevel, setAccessLevel] = useState<(typeof accessLevelOptions)[number]>("member");
  const [isActive, setIsActive] = useState<"active" | "inactive">("active");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberRecord[]>(() =>
    picOptions
      .filter((person) => person.team === initialTeamName)
      .map((person, index) => ({
        id: person.value,
        name: person.label,
        email: `${person.label.toLowerCase().replaceAll(" ", ".")}@company.com`,
        team: person.team,
        role: index === 0 ? "Lead" : "Engineer",
        accessLevel: index === 0 ? "lead" : "member",
        isActive: "active",
        createdAt: new Date().toISOString(),
        createdBy: DEFAULT_ADMIN,
      })),
  );

  if (!team) {
    return (
      <AppShell
        activeNav="teams"
        breadcrumbs={[
          { label: "Teams", href: "/teams" },
          { label: "Team not found" },
        ]}
        eyebrow="People & ownership"
        title="Team not found"
      >
        <Card>
          <CardHeader>
            <CardTitle>Team not found</CardTitle>
            <CardDescription>Team dengan id `{id}` belum tersedia di data bug tracker saat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/teams" />} variant="outline">
              Back to teams
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const teamName = team.name;

  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = members.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const isEditing = editingMemberId !== null;

  function resetForm() {
  setEditingMemberId(null);
  setMemberName("");
  setMemberEmail("");
  setMemberRole("Engineer");
  setAccessLevel("member");
  setIsActive("active");
  setIsAddMemberOpen(false);
}

  function handleSubmit() {
    if (!memberName.trim() || !memberEmail.trim()) {
      return;
    }

    if (isEditing) {
      setMembers((current) =>
        current.map((member) =>
          member.id === editingMemberId
            ? {
                ...member,
                name: memberName.trim(),
                email: memberEmail.trim(),
                role: memberRole,
                accessLevel,
                isActive,
              }
            : member,
        ),
      );
      resetForm();
      return;
    }

    setMembers((current) => [
      ...current,
      {
        id: `${memberName.toLowerCase().replaceAll(/\s+/g, "-")}-${current.length + 1}`,
        name: memberName.trim(),
        email: memberEmail.trim(),
        team: teamName,
        role: memberRole,
        accessLevel,
        createdAt: new Date().toISOString(), 
        createdBy: DEFAULT_ADMIN, 
        isActive: "active",
      },
    ]);
    resetForm();
  }

  function handleEdit(member: TeamMemberRecord) {
  setEditingMemberId(member.id);
  setMemberName(member.name);
  setMemberEmail(member.email);
  setMemberRole(member.role);
  setAccessLevel(member.accessLevel);
  setIsActive(member.isActive);
  setIsAddMemberOpen(true);
}

  return (
    <AppShell
      activeNav="teams"
      breadcrumbs={[
        { label: "Teams", href: "/teams" },
        { label: teamName },
        { label: "Add Members" },
      ]}
      eyebrow="People & ownership"
      title={`Add Members - ${teamName}`}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Add people to team</h2>
            <p className="text-sm text-muted-foreground">Penambahan orang dipisah dari maintenance group team supaya role dan membership lebih rapi.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
          <Button nativeButton={false} render={<Link href="/teams" />} variant="outline">
            <ArrowLeft/>  Back to teams
          </Button>
           <Button
            onClick={() => {
              resetForm();
              setIsAddMemberOpen(true);
            }}
          >
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
                  <TableHead>Role</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Is Active</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMembers.length ? (
                  paginatedMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="font-medium">{member.email}</TableCell>
                      <TableCell className="text-muted-foreground">{member.team}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>{member.accessLevel}</TableCell>
                      <TableCell>{member.createdBy}</TableCell>
                      <TableCell className="text-muted-foreground">
                      {formatDate(member.createdAt)}
                    </TableCell>
                      <TableCell>{member.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Button onClick={() => handleEdit(member)} variant="outline" size="icon-sm">
                          <Edit />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedMembers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, members.length)} of {members.length} members
              </p>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>
        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit member" : "Add member"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? `Update data anggota team ${teamName}.`
                  : `Tambahkan anggota baru ke team ${teamName}.`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="member-name">Full name</Label>
                <Input
                  id="member-name"
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  placeholder="Contoh: Nabila Putri"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="Contoh: nabila@company.com"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="member-role">Role</Label>
                <Select value={memberRole} onValueChange={(value) => setMemberRole(value as (typeof roleOptions)[number])}>
                  <SelectTrigger className="w-full" id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Access level</Label>
                <Select value={accessLevel} onValueChange={(value) => setAccessLevel(value as (typeof accessLevelOptions)[number])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accessLevelOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "member" ? "Member" : option === "lead" ? "Lead" : "Observer"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isEditing ? (
                <div className="grid gap-2">
                  <Label>Is active</Label>
                  <Select value={isActive} onValueChange={(value) => setIsActive(value as "active" | "inactive")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button onClick={resetForm} variant="outline">
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {isEditing ? <Save /> : <UserPlus />}
                  {isEditing ? "Save member" : `Add to ${teamName}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
