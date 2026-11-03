"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Settings2, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { requestJson } from "@/lib/request";
import { cn } from "@/lib/utils";
import type { Team } from "@/types";

const PAGE_SIZE = 10;
const COLUMNS = 7;

export function TeamsPage() {
  // null = masih dimuat
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [page, setPage] = useState(1);

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

          <Button
            nativeButton={false}
            render={
              <Link href="/teams/groups">
                <Settings2 />
                Manage group teams
              </Link>
            }
            size="lg"
          />
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Team overview</CardTitle>
          <CardDescription>Each group team is named after its Teams Domain.</CardDescription>
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
                        <Button nativeButton={false} render={<Link href={`/teams/${team.NewId}/members`} />} size="sm" variant="outline">
                          <UserPlus className="mr-2 size-4" />
                          Add member
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {loaded && paginatedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS} className="py-10 text-center text-muted-foreground">
                    No group teams yet. Click Manage group teams to create one.
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
    </AppShell>
  );
}
