  "use client";

  import Link from "next/link";
  import { useMemo, useState } from "react";
  import { Download, Eye, ListFilter, Plus, Search, ShieldAlert, TimerReset, TriangleAlert } from "lucide-react";

  import { AppShell } from "@/components/layout/app-shell";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
  import { TablePagination } from "@/components/ui/table-pagination";
  import {
    issues,
    priorityVariant,
    statusVariant,
    type IssueRecord,
    type IssueStatus,
    type Priority,
  } from "@/features/bug-tracker/data/bug-tracker-data";
  import { formatDate } from "@/lib/date";

  const PAGE_SIZE = 10;

  type LabelFilter = string | "None" | "all";
  type StatusFilter = IssueStatus | "all";
  type PriorityFilter = Priority | "all";

  const stats = [
    {
      title: "Total open",
      value: "34",
      change: "+12.4%",
      note: "Compared with last week",
      icon: TimerReset,
    },
    {
      title: "In progress",
      value: "18",
      change: "+6.1%",
      note: "Across active squads",
      icon: ListFilter,
    },
    {
      title: "Critical blockers",
      value: "4",
      change: "+2.0%",
      note: "Need same-day action",
      icon: TriangleAlert,
    },
    {
      title: "Closed",
      value: "29",
      change: "+18.7%",
      note: "Resolved this week",
      icon: ShieldAlert,
    },
  ] as const;


  function exportIssuesToCsv(rows: IssueRecord[]) {
    const headers = ["Ticket ID", "Title", "Status", "Priority", "Label", "Created Date"];
    const values = rows.map((issue) => [
      issue.id,
      issue.title,
      issue.status,
      issue.priority,
      issue.label,
      issue.createdAt,
    ]);

    const csv = [headers, ...values]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "bug-tracker-issues.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function IssuesToolbar({
    status,
    priority,
    label,
    searchQuery,
    onStatusChange,
    onPriorityChange,
    onLabelChange,
    onSearchChange,
    onExport,
  }: {
    status: StatusFilter;
    priority: PriorityFilter;
    label: LabelFilter;
    searchQuery: string;
    onStatusChange: (value: StatusFilter) => void;
    onPriorityChange: (value: PriorityFilter) => void;
    onLabelChange: (value: LabelFilter) => void;
    onSearchChange: (value: string) => void;
    onExport: () => void;
  }) {
    const labels = Array.from(new Set(issues.map((issue) => issue.label)));

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <CardTitle>Issue table</CardTitle>
          <CardDescription>
            Filter current bug inventory by workflow state, severity, and label.
          </CardDescription>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
          <div className="flex w-full min-w-0 sm:min-w-56 items-center gap-2 rounded-xl border bg-card px-3 sm:w-auto">
            <Search className="size-4 text-muted-foreground" />
            <Input
              aria-label="Search issues"
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="Search ticket id, title, or label..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>

          <Select value={status} onValueChange={(value) => onStatusChange(value as StatusFilter)}>
            <SelectTrigger className="h-9 w-auto min-w-[88px] px-2.5">
              <SelectValue placeholder="all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="Backlog">Backlog</SelectItem>
              <SelectItem value="Ready">Ready</SelectItem>
              <SelectItem value="Investigating">Investigating</SelectItem>
              <SelectItem value="In review">In review</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priority}
            onValueChange={(value) => onPriorityChange(value as PriorityFilter)}
          >
            <SelectTrigger className="h-9 w-auto min-w-[88px] px-2.5">
              <SelectValue placeholder="all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={label} onValueChange={(value) => onLabelChange(value as LabelFilter)}>
            <SelectTrigger className="h-9 w-auto min-w-[88px] px-2.5">
              <SelectValue placeholder="all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">all</SelectItem>
              <SelectItem value="None">None</SelectItem>
              {labels.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onExport} variant="secondary">
            <Download />
            Export
          </Button>
        </div>
      </div>
    );
  }

  export function AllIssuesPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
    const [labelFilter, setLabelFilter] = useState<LabelFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);

    const filteredIssues = useMemo(() => {
      const normalizedQuery = searchQuery.trim().toLowerCase();

      return issues.filter((issue) => {
        const statusMatch = statusFilter === "all" || issue.status === statusFilter;
        const priorityMatch = priorityFilter === "all" || issue.priority === priorityFilter;
        const labelMatch =
          labelFilter === "all"
            ? true
            : labelFilter === "None"
              ? issue.label === "None"
              : issue.label === labelFilter;
        const searchMatch =
          !normalizedQuery ||
          issue.id.toLowerCase().includes(normalizedQuery) ||
          issue.title.toLowerCase().includes(normalizedQuery) ||
          issue.label.toLowerCase().includes(normalizedQuery);

        return statusMatch && priorityMatch && labelMatch && searchMatch;
      });
    }, [labelFilter, priorityFilter, searchQuery, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedIssues = filteredIssues.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

    return (
      <AppShell
        activeNav="issues"
        breadcrumbs={[{ label: "All Issues" }]}
        eyebrow="Issue registry"
        title="All Issues"
        toolbar={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">Issue monitoring and triage</h2>
              <p className="text-sm text-muted-foreground">
                Pantau daftar issue, prioritas, dan workflow triage dalam satu tampilan.
              </p>
            </div>

            <Button
              nativeButton={false}
              render={
                <Link href="/issues/create">
                  <Plus />
                  Create issue
                </Link>
              }
              size="lg"
            />
          </div>
        }
      >
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="h-full">
                <CardHeader className="h-full">
                  <div className="flex h-full items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <CardDescription className="truncate font-semibold">
                        {item.title}
                      </CardDescription>

                      <CardDescription className="mt-1 truncate">
                        {item.note}
                      </CardDescription>

                      <div className="mt-3 flex items-center gap-3">
                        <CardTitle className="text-4xl leading-none">
                          {item.value}
                        </CardTitle>

                        <Badge variant="secondary" className="translate-y-0.5">
                          {item.change}
                        </Badge>
                      </div>
                    </div>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
                </CardHeader>
              </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <IssuesToolbar
                label={labelFilter}
                onExport={() => exportIssuesToCsv(filteredIssues)}
                onLabelChange={(value) => {
                  setLabelFilter(value);
                  setPage(1);
                }}
                onPriorityChange={(value) => {
                  setPriorityFilter(value);
                  setPage(1);
                }}
                onSearchChange={(value) => {
                  setSearchQuery(value);
                  setPage(1);
                }}
                onStatusChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                priority={priorityFilter}
                searchQuery={searchQuery}
                status={statusFilter}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10%]">Ticket ID</TableHead>
                    <TableHead className="w-[28%]">Title</TableHead>
                    <TableHead className="w-[10%]">Label</TableHead>
                    <TableHead className="w-[10%]">Team</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="w-[10%]">Priority</TableHead>
                    <TableHead className="w-[12%]">Created date</TableHead>
                    <TableHead className="w-[8%]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIssues.length ? (
                    paginatedIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium whitespace-normal break-words">{issue.id}</TableCell>
                        <TableCell className="whitespace-normal break-words">
                          <p className="font-medium">{issue.title}</p>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <Badge variant="outline">{issue.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-normal break-words">
                          {issue.team}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <Badge variant={statusVariant(issue.status)}>{issue.status}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <Badge variant={priorityVariant(issue.priority)}>{issue.priority}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-normal">
                          {formatDate(issue.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <Button
                            nativeButton={false}
                            render={<Link href={`/issues/${issue.id}`} />}
                            size="sm"
                            variant="outline"
                          >
                            <Eye />
                            Show
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No issues match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {paginatedIssues.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
                  {Math.min(currentPage * PAGE_SIZE, filteredIssues.length)} of {filteredIssues.length} issues
                </p>
                <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }
