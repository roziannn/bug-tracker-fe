"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { formatDateTime } from "@/lib/date";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import type { AuditTrailEntry, AuditTrailOutcome } from "@/features/bug-tracker/data/bug-tracker-data";

const PAGE_SIZE = 8;

function formatTimestamp(dateString: string) {
  return formatDateTime(dateString);
}

function outcomeVariant(outcome: AuditTrailOutcome): "default" | "secondary" | "destructive" {
  if (outcome === "Success") return "secondary";
  if (outcome === "Warning") return "default";
  return "destructive";
}

function exportAuditTrailToCsv(rows: AuditTrailEntry[]) {
  const headers = ["Audit ID", "Actor", "Role", "Action", "Target", "Team", "Outcome", "Timestamp", "Detail"];
  const values = rows.map((entry) => [entry.id, entry.actor, entry.actorRole, entry.action, `${entry.targetType}: ${entry.targetName}`, entry.team, entry.outcome, entry.createdAt, entry.detail]);

  const csv = [headers, ...values].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "audit-trail.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function AuditTrailPage({ initialEntries }: { initialEntries: AuditTrailEntry[] }) {
  const [auditTrailEntries] = useState<AuditTrailEntry[]>(initialEntries);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return auditTrailEntries.filter((entry) => {
      const matchesSearch =
        !normalizedQuery ||
        String(entry.id).toLowerCase().includes(normalizedQuery) ||
        entry.actor.toLowerCase().includes(normalizedQuery) ||
        entry.actorRole.toLowerCase().includes(normalizedQuery) ||
        entry.action.toLowerCase().includes(normalizedQuery) ||
        entry.team.toLowerCase().includes(normalizedQuery) ||
        entry.outcome.toLowerCase().includes(normalizedQuery) ||
        entry.targetName.toLowerCase().includes(normalizedQuery) ||
        entry.detail.toLowerCase().includes(normalizedQuery);

      return matchesSearch;
    });
  }, [auditTrailEntries, searchQuery]);

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
            <SearchInput
                className="w-full rounded-xl sm:min-w-64 sm:w-auto"
                aria-label="Search audit trail"
                placeholder="Search audit id, actor, target, or detail..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
              />

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
                  <TableHead>Note</TableHead>
                  <TableHead>Outcome</TableHead>
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
                          <p className="font-medium">{entry.detail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <Badge variant={outcomeVariant(entry.outcome)}>{entry.outcome}</Badge>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground whitespace-normal wrap-break-word">{formatTimestamp(entry.createdAt)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      &quot;No audit events match your search.&quot;
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
