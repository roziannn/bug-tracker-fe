"use client";

import { useMemo, useState } from "react";
import { Activity, Download, Lock, Search, ShieldCheck, ShieldX } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { auditTrailEntries, type AuditTrailAction, type AuditTrailEntry, type AuditTrailOutcome } from "@/features/bug-tracker/data/bug-tracker-data";

const PAGE_SIZE = 8;

type OutcomeFilter = AuditTrailOutcome | "all";
type ActionFilter = AuditTrailAction | "all";
type TeamFilter = string | "all";

const stats = [
  {
    title: "Total events",
    value: String(auditTrailEntries.length),
    note: "Recorded from issue, project, and access changes",
    icon: Activity,
  },
  {
    title: "Privileged changes",
    value: String(auditTrailEntries.filter((entry) => entry.action === "Permission changed" || entry.action === "Role updated").length),
    note: "Role and permission updates requiring audit visibility",
    icon: ShieldCheck,
  },
  {
    title: "Warnings",
    value: String(auditTrailEntries.filter((entry) => entry.outcome === "Warning").length),
    note: "Events that need extra review or follow-up",
    icon: Lock,
  },
  {
    title: "Blocked attempts",
    value: String(auditTrailEntries.filter((entry) => entry.outcome === "Blocked").length),
    note: "Access changes or login attempts denied by policy",
    icon: ShieldX,
  },
] as const;

function formatTimestamp(dateString: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function outcomeVariant(outcome: AuditTrailOutcome): "default" | "secondary" | "destructive" {
  if (outcome === "Success") return "secondary";
  if (outcome === "Warning") return "default";
  return "destructive";
}

function exportAuditTrailToCsv(rows: AuditTrailEntry[]) {
  const headers = ["Audit ID", "Actor", "Role", "Action", "Target", "Team", "Outcome", "IP Address", "Timestamp", "Detail"];
  const values = rows.map((entry) => [entry.id, entry.actor, entry.actorRole, entry.action, `${entry.targetType}: ${entry.targetName}`, entry.team, entry.outcome, entry.ipAddress, entry.createdAt, entry.detail]);

  const csv = [headers, ...values].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "audit-trail.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditTrailPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [page, setPage] = useState(1);

  const actionOptions = Array.from(new Set(auditTrailEntries.map((entry) => entry.action)));
  const teamOptions = Array.from(new Set(auditTrailEntries.map((entry) => entry.team)));

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return auditTrailEntries.filter((entry) => {
      const matchesOutcome = outcomeFilter === "all" || entry.outcome === outcomeFilter;
      const matchesAction = actionFilter === "all" || entry.action === actionFilter;
      const matchesTeam = teamFilter === "all" || entry.team === teamFilter;
      const matchesSearch =
        !normalizedQuery ||
        entry.id.toLowerCase().includes(normalizedQuery) ||
        entry.actor.toLowerCase().includes(normalizedQuery) ||
        entry.targetName.toLowerCase().includes(normalizedQuery) ||
        entry.detail.toLowerCase().includes(normalizedQuery);

      return matchesOutcome && matchesAction && matchesTeam && matchesSearch;
    });
  }, [actionFilter, outcomeFilter, searchQuery, teamFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AppShell
      activeNav="audit-trail"
      title="Audit Trail"
      breadcrumbs={[{ label: "Audit Trail" }]}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Audit activity and access history</h2>
            <p className="text-sm text-muted-foreground">Cari event berdasarkan aktor, target, atau action yang terlibat.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
            <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border bg-card px-3 sm:min-w-64 sm:w-auto">
              <Search className="size-4 text-muted-foreground" />
              <Input
                aria-label="Search audit trail"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                placeholder="Search audit id, actor, target, or detail..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={outcomeFilter}
              onValueChange={(value) => {
                setOutcomeFilter(value as OutcomeFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-25 px-2.5">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={actionFilter}
              onValueChange={(value) => {
                setActionFilter(value as ActionFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-20 px-2.5">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                {actionOptions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={teamFilter}
              onValueChange={(value) => {
                setTeamFilter(value as TeamFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-auto min-w-20 px-2.5">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={() => exportAuditTrailToCsv(filteredEntries)} variant="secondary">
              <Download />
              Export
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.length ? (
                  paginatedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="align-top whitespace-normal wrap-break-word">
                        <p className="font-medium">{entry.actor}</p>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal wrap-break-word">{entry.action}</TableCell>
                      <TableCell className="align-top whitespace-normal wrap-break-word">
                        <div className="space-y-1">
                          <p className="font-medium">{entry.targetName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <Badge variant={outcomeVariant(entry.outcome)}>{entry.outcome}</Badge>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground whitespace-normal wrap-break-word">{entry.ipAddress}</TableCell>
                      <TableCell className="align-top text-muted-foreground whitespace-normal wrap-break-word">{formatTimestamp(entry.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No audit events match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedEntries.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filteredEntries.length)} of {filteredEntries.length} audit events
              </p>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
