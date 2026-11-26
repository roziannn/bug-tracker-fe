"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, ListFilter, Plus, ShieldAlert, TimerReset, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import type { Project } from "@/types";

type RequestRow = { id: string; number: string; title: string; type: string; priority: string; status: string; requestedTargetDate: string | null; projectId: string | null; project: string | null; requester: string | null; pic: string | null; createdAt: string };
const PAGE_SIZE = 10;
const statuses = ["Draft", "Submitted", "In Review", "Approved", "In Progress", "Done", "Rejected", "Returned", "On Hold", "Cancelled"];
const priorities = ["Low", "Medium", "High", "Critical"];

function statusStyle(status: string) {
  if (status === "Done" || status === "Approved") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (status === "Rejected" || status === "Returned" || status === "Cancelled") return "bg-destructive/10 text-destructive";
  if (status === "In Review" || status === "In Progress") return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
  if (status === "On Hold") return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function exportRequestsToCsv(requests: RequestRow[]) {
  const headers = ["Request Number", "Title", "Status", "Priority", "Project", "Requester", "PIC", "Target Date", "Created Date"];
  const values = requests.map((row) => [row.number, row.title, row.status, row.priority, row.project, row.requester, row.pic, row.requestedTargetDate, row.createdAt]);
  const csv = [headers, ...values]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "service-requests.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ServiceRequestListPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      fetch("/api/service-requests", { cache: "no-store" }).then((res) => { if (!res.ok) throw new Error("Failed to load service requests"); return res.json(); }),
      fetch("/api/projects", { cache: "no-store" }).then((res) => res.ok ? res.json() : []),
    ]).then(([requests, projectRows]) => { setRows(requests); setProjects(projectRows); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rows.filter((row) =>
    (status === "all" || row.status === status) && (priority === "all" || row.priority === priority) &&
    (projectId === "all" || row.projectId === projectId) &&
    (!search || `${row.number} ${row.title} ${row.requester ?? ""} ${row.pic ?? ""}`.toLowerCase().includes(search.toLowerCase()))
  ), [rows, status, priority, projectId, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const closedStatuses = new Set(["done", "rejected", "cancelled"]);
  const openRows = rows.filter((row) => row.status.toLowerCase() !== "draft" && !closedStatuses.has(row.status.toLowerCase()));
  const inProgressCount = rows.filter((row) => ["in progress", "in review"].includes(row.status.toLowerCase())).length;
  const criticalOpenCount = openRows.filter((row) => row.priority.toLowerCase() === "critical").length;
  const completedCount = rows.filter((row) => row.status.toLowerCase() === "done").length;
  const summaryCards = [
    { title: "Total open", subtitle: "Submitted requests", value: openRows.length, icon: TimerReset },
    { title: "In progress", subtitle: "In progress or in review", value: inProgressCount, icon: ListFilter },
    { title: "Critical blockers", subtitle: "Open critical requests", value: criticalOpenCount, icon: TriangleAlert },
    { title: "Closed", subtitle: "Completed requests", value: completedCount, icon: ShieldAlert },
  ];

  return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests" }]} eyebrow="Request management" title="Service Requests" toolbar={<div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Service Requests</h2><p className="text-sm text-muted-foreground">Track business requests from submission through delivery.</p></div><Button nativeButton={false} render={<Link href="/service-requests/new" />}><Plus />New request</Button></div>}>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map(({ title, subtitle, value, icon: Icon }) => <Card key={title} className="gap-4 py-5">
        <CardContent className="space-y-3 px-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></span>
          </div>
          <p className="text-4xl font-semibold tracking-tight">{value}<span className="ml-2 inline-flex translate-y-[-3px] rounded-full bg-muted px-2.5 py-1 align-middle text-xs font-medium text-muted-foreground">Live</span></p>
        </CardContent>
      </Card>)}
    </div>
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="shrink-0"><CardTitle>All Requests</CardTitle></div>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-center lg:justify-end">
          <SearchInput className="w-full rounded-xl sm:col-span-2 sm:w-auto sm:min-w-56" aria-label="Search requests" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search number or title..." />
          <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }}><SelectTrigger className="w-full lg:w-32"><SelectValue placeholder="All Status">{status === "all" ? "All Status" : undefined}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Select value={priority} onValueChange={(v) => { setPriority(v ?? "all"); setPage(1); }}><SelectTrigger className="w-full lg:w-32"><SelectValue placeholder="All Priority">{priority === "all" ? "All Priority" : undefined}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem>{priorities.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          <Select value={projectId} onValueChange={(v) => { setProjectId(v ?? "all"); setPage(1); }}><SelectTrigger className="w-full lg:w-32"><SelectValue placeholder="All Projects">{projectId === "all" ? "All Projects" : undefined}</SelectValue></SelectTrigger><SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map((project) => <SelectItem key={project.NewId} value={project.NewId}>{project.Name}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => exportRequestsToCsv(filtered)} variant="secondary"><Download />Export</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Project</TableHead><TableHead>Requester</TableHead><TableHead>PIC</TableHead><TableHead>Target</TableHead></TableRow></TableHeader><TableBody>
          {visible.map((row) => <TableRow key={row.id}><TableCell><Link href={`/service-requests/${row.id}`} className="font-medium text-primary hover:underline">{row.number}</Link><p className="max-w-xs truncate text-xs text-muted-foreground">{row.title}</p></TableCell><TableCell><Badge className={statusStyle(row.status)} variant="outline">{row.status}</Badge></TableCell><TableCell>{row.priority}</TableCell><TableCell>{row.project ?? "—"}</TableCell><TableCell>{row.requester ?? "—"}</TableCell><TableCell>{row.pic ?? "—"}</TableCell><TableCell>{row.requestedTargetDate ?? "—"}</TableCell></TableRow>)}
          {!loading && !visible.length ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><ClipboardList className="mx-auto mb-2 size-5" />{error || "No service requests match these filters."}</TableCell></TableRow> : null}
          {loading ? <TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Loading service requests…</TableCell></TableRow> : null}
        </TableBody></Table></div>
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-muted-foreground">Showing {visible.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} requests</p><TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} /></div>
      </CardContent>
    </Card>
  </AppShell>;
}
