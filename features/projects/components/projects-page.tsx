"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarClock, Download, Eye, Flag, Pencil, Plus, Search, UserRound } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { TableSkeletonRows } from "@/components/ui/table-skeleton";
import { appToast } from "@/lib/app-toast";
import { getCurrentStatus, statusLabels, type CurrentStatus } from "@/features/projects/data/current-status";
import { formatDate, parseDateOnly, todayDateOnly } from "@/lib/date";
import { PriorityBadge } from "@/features/projects/components/priority-badge";
import type { Project } from "@/types";

const PAGE_SIZE = 10;
const COLUMNS = 9;

// Status saat ini: nama phase yang sedang berjalan, atau posisi project terhadap timeline-nya.
function StatusBadges({ status }: { status: CurrentStatus | null }) {
  if (!status || status.kind === "none") return <span className="text-muted-foreground">-</span>;

  if (status.kind === "active") {
    return (
      <div className="flex flex-wrap gap-1">
        {status.phases.map((name) => (
          <Badge key={name}>{name}</Badge>
        ))}
      </div>
    );
  }

  return <Badge variant={status.kind === "completed" ? "secondary" : "outline"}>{statusLabels(status)[0]}</Badge>;
}

function exportProjectsToCsv(rows: Project[], statuses: Map<string, CurrentStatus | null>) {
  const headers = ["Project", "Description", "Owner", "Priority", "Current Status", "Tags", "Go Live", "Timeline Start", "Timeline End", "Phases", "Created By", "Created Date"];

  const values = rows.map((project) => [
    project.Name,
    project.Description,
    project.OwnerName,
    project.Priority,
    (statuses.get(project.NewId) ? statusLabels(statuses.get(project.NewId)!) : []).join("; "),
    project.Tags.join("; "),
    project.GoLiveDate ?? "",
    project.TimelineStart ?? "",
    project.TimelineEnd ?? "",
    project.PhaseCount,
    project.CreatedBy ?? "System",
    project.CreatedDate,
  ]);

  const csv = [headers, ...values]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "project-portfolio.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ProjectsPage() {
  // null = masih dimuat
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<Project[]>;
      })
      .then(setProjects)
      .catch(() => {
        setProjects([]);
        appToast.error({ title: "Failed to load projects", description: "Something went wrong, please try again." });
      });
  }, []);

  const loaded = projects !== null;
  const allProjects = useMemo(() => projects ?? [], [projects]);
  const ownerOptions = useMemo(() => Array.from(new Set(allProjects.map((project) => project.OwnerName))).sort(), [allProjects]);
  // Hari ini hanya dipakai setelah data termuat (di browser), jadi tidak ada beda hasil render server dan browser.
  const today = useMemo(() => (projects === null ? null : todayDateOnly()), [projects]);
  const statuses = useMemo(
    () => new Map(allProjects.map((project) => [project.NewId, today === null ? null : getCurrentStatus(project.Phases, today)] as const)),
    [allProjects, today]
  );
  const statusOptions = useMemo(
    () =>
      Array.from(new Set(Array.from(statuses.values()).flatMap((status) => (status ? statusLabels(status) : [])))).sort(),
    [statuses]
  );

  // Angka ringkasan dihitung dari database.
  const stats = useMemo(() => {
    if (projects === null || today === null) return null;

    const upcomingGoLive = projects.filter((project) => {
      const goLive = project.GoLiveDate ? parseDateOnly(project.GoLiveDate) : null;
      return goLive !== null && goLive >= today;
    }).length;
    const inProgress = Array.from(statuses.values()).filter((status) => status?.kind === "active").length;

    return {
      total: projects.length,
      upcomingGoLive,
      inProgress,
      owners: new Set(projects.map((project) => project.OwnerId)).size,
    };
  }, [projects, statuses, today]);

  const highlights = [
    { label: "Tracked projects", note: "Projects in the portfolio.", icon: BriefcaseBusiness, value: stats?.total },
    { label: "Upcoming go-lives", note: "Go Live date is today or later.", icon: Flag, value: stats?.upcomingGoLive },
    { label: "In progress", note: "A phase is running today.", icon: CalendarClock, value: stats?.inProgress },
    { label: "Project owners", note: "People who own a project.", icon: UserRound, value: stats?.owners },
  ];

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return allProjects.filter((project) => {
      const ownerMatch = ownerFilter === "all" || project.OwnerName === ownerFilter;
      const status = statuses.get(project.NewId);
      const labels = status ? statusLabels(status) : [];
      const statusMatch = statusFilter === "all" || labels.includes(statusFilter);
      const searchMatch =
        !normalizedQuery ||
        project.Name.toLowerCase().includes(normalizedQuery) ||
        project.Description.toLowerCase().includes(normalizedQuery) ||
        project.OwnerName.toLowerCase().includes(normalizedQuery) ||
        labels.some((label) => label.toLowerCase().includes(normalizedQuery));

      return ownerMatch && statusMatch && searchMatch;
    });
  }, [allProjects, ownerFilter, searchQuery, statusFilter, statuses]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedProjects = useMemo(
    () => filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, filteredProjects]
  );

  return (
    <AppShell
      activeNav="projects"
      eyebrow="Project routing"
      title="Projects"
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Project portfolio</h2>
            <p className="text-sm text-muted-foreground">Manage projects, their owners, current status, timelines, and go-live dates.</p>
          </div>

          <Button
            nativeButton={false}
            render={
              <Link href="/projects/create">
                <Plus />
                Create project
              </Link>
            }
            size="lg"
          />
        </div>
      }
    >
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.label} className="h-full">
                <CardHeader className="h-full">
                  <div className="flex h-full items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <CardDescription className="truncate font-semibold">{item.label}</CardDescription>
                      <CardDescription className="mt-1 truncate">{item.note}</CardDescription>

                      <div className="mt-3 flex items-center gap-3">
                        {item.value === undefined ? (
                          <Skeleton className="h-9 w-12" aria-hidden="true" />
                        ) : (
                          <CardTitle className="text-4xl leading-none">{item.value}</CardTitle>
                        )}
                      </div>
                    </div>

                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <CardTitle>Projects</CardTitle>
              <CardDescription>Every project with its owner, current status, go-live date, and timeline.</CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
              <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border bg-card px-3 sm:w-auto sm:min-w-56">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  aria-label="Search projects"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search project..."
                  value={searchQuery}
                />
              </div>
              <Select
                onValueChange={(value) => {
                  setOwnerFilter(value ?? "all");
                  setPage(1);
                }}
                value={ownerFilter}
              >
                <SelectTrigger className="h-9 w-auto min-w-[88px] px-2.5" aria-label="Filter by owner">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all owners</SelectItem>
                  {ownerOptions.map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) => {
                  setStatusFilter(value ?? "all");
                  setPage(1);
                }}
                value={statusFilter}
              >
                <SelectTrigger className="h-9 w-auto min-w-[88px] px-2.5" aria-label="Filter by current status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all statuses</SelectItem>
                  {statusOptions.map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => exportProjectsToCsv(filteredProjects, statuses)} variant="secondary" disabled={!filteredProjects.length}>
                <Download />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Current status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Go Live</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loaded ? <TableSkeletonRows rows={5} columns={COLUMNS} /> : null}
                {loaded
                  ? paginatedProjects.map((project) => (
                      <TableRow key={project.NewId}>
                        <TableCell className="align-top whitespace-normal">
                          <div className="flex gap-1">
                            <Button
                              nativeButton={false}
                              render={<Link href={`/projects/${project.NewId}`} />}
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Show ${project.Name}`}
                              title="Show"
                            >
                              <Eye />
                            </Button>
                            <Button
                              nativeButton={false}
                              render={<Link href={`/projects/${project.NewId}/edit`} />}
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Edit ${project.Name}`}
                              title="Edit"
                            >
                              <Pencil />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-64 align-top whitespace-normal break-words">
                          <p className="font-medium">{project.Name}</p>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          <StatusBadges status={statuses.get(project.NewId) ?? null} />
                        </TableCell>
                        <TableCell className="align-top whitespace-normal">
                          <PriorityBadge priority={project.Priority} />
                        </TableCell>
                        <TableCell className="align-top whitespace-normal break-words">{project.OwnerName}</TableCell>
                        <TableCell className="align-top">{project.GoLiveDate ? formatDate(project.GoLiveDate) : "-"}</TableCell>
                        <TableCell className="align-top whitespace-normal">
                          {project.TimelineStart && project.TimelineEnd ? (
                            <p>
                              {formatDate(project.TimelineStart)} - {formatDate(project.TimelineEnd)}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">{project.CreatedBy || "System"}</TableCell>
                        <TableCell className="align-top text-muted-foreground">{formatDate(project.CreatedDate)}</TableCell>
                      </TableRow>
                    ))
                  : null}
                {loaded && paginatedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS} className="py-10 text-center text-muted-foreground">
                      {allProjects.length === 0 ? "No projects yet. Click Create project to add one." : "No projects match your filters."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedProjects.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
                {Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} projects
              </p>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
