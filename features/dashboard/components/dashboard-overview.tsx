"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDot, GitBranch, ShieldAlert, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { priorityVariant, statusVariant } from "@/features/bug-tracker/data/bug-tracker-data";

const iconMap = {
  "circle-dot": CircleDot,
  "shield-alert": ShieldAlert,
  "git-branch": GitBranch,
  sparkles: Sparkles,
} as const;

const teamChartConfig = {
  total: {
    label: "Issues",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const priorityChartConfig = {
  count: {
    label: "Issues",
  },
  Critical: {
    label: "Critical",
    color: "var(--destructive)",
  },
  High: {
    label: "High",
    color: "var(--color-chart-4)",
  },
  Medium: {
    label: "Medium",
    color: "var(--color-chart-1)",
  },
  Low: {
    label: "Low",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

const kanbanChartConfig = {
  cards: {
    label: "Kanban cards",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig;

const priorityOrder = ["Critical", "High", "Medium", "Low"] as const;
const statusOrder = ["Backlog", "Ready", "Investigating", "In review", "Done"] as const;
type PriorityKey = (typeof priorityOrder)[number];

const WATCHLIST_PAGE_SIZE = 5;
const KANBAN_STATUS_ORDER = ["Backlog", "Ready", "Investigating", "In review", "Done"];

type KanbanCardRecord = { id: string; status: string };
type ActualIssueSummary = {
  id: string;
  title: string;
  status: string;
  team: string | null;
  pic: string | null;
  criticality: string;
  resolvedAt: string | null;
};

function getPriorityLabel(priority: PriorityKey) {
  return priorityChartConfig[priority].label ?? priority;
}

export function DashboardOverview() {
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [kanbanCards, setKanbanCards] = useState<KanbanCardRecord[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(true);
  const [actualIssues, setActualIssues] = useState<ActualIssueSummary[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/issues", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Unable to load issues"))))
      .then((data: unknown) => {
        if (active && Array.isArray(data)) {
          setActualIssues(data.filter((issue): issue is ActualIssueSummary =>
            typeof issue?.id === "string" && typeof issue?.title === "string" &&
            typeof issue?.status === "string" &&
            (typeof issue?.team === "string" || issue?.team === null) &&
            (typeof issue?.pic === "string" || issue?.pic === null) &&
            typeof issue?.criticality === "string" &&
            (typeof issue?.resolvedAt === "string" || issue?.resolvedAt === null),
          ));
        }
      })
      .catch(() => {
        if (active) setActualIssues([]);
      })
      .finally(() => {
        if (active) setIssuesLoading(false);
      });

    return () => { active = false; };
  }, []);

  const issuesByTeam = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of actualIssues) {
      const team = issue.team?.trim() || "Unassigned";
      counts.set(team, (counts.get(team) ?? 0) + 1);
    }
    return [...counts].map(([team, total]) => ({ team, total, fill: "var(--color-chart-1)" }))
      .sort((left, right) => right.total - left.total);
  }, [actualIssues]);

  const issuesByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of actualIssues) counts.set(issue.status, (counts.get(issue.status) ?? 0) + 1);
    const known = statusOrder.filter((status) => counts.has(status));
    const custom = [...counts.keys()].filter((status) => !statusOrder.includes(status as (typeof statusOrder)[number]));
    return [...known, ...custom].map((status, index) => ({
      status,
      total: counts.get(status) ?? 0,
      fill: `var(--color-chart-${(index % 5) + 1})`,
    }));
  }, [actualIssues]);

  const issuesByPriority = useMemo(() => {
    const priorityForCriticality: Record<string, PriorityKey> = {
      "Tier 1 - Critical": "Critical",
      "Tier 2 - Major": "High",
      "Tier 3 - Moderate": "Medium",
      "Tier 4 - Minor": "Low",
    };
    return priorityOrder.map((priority) => ({
      priority,
      count: actualIssues.filter((issue) => priorityForCriticality[issue.criticality] === priority).length,
      fill: priorityChartConfig[priority].color ?? "var(--color-chart-1)",
    }));
  }, [actualIssues]);

  const totalIssues = actualIssues.length;
  const urgentIssues = issuesByPriority
    .filter((entry) => entry.priority === "Critical" || entry.priority === "High")
    .reduce((total, entry) => total + entry.count, 0);
  const urgentWatchlist = useMemo(() => actualIssues
    .filter((issue) => issue.criticality === "Tier 1 - Critical" || issue.criticality === "Tier 2 - Major")
    .sort((left, right) => {
      const leftRank = left.criticality === "Tier 1 - Critical" ? 0 : 1;
      const rightRank = right.criticality === "Tier 1 - Critical" ? 0 : 1;
      return leftRank - rightRank;
    }), [actualIssues]);
  const resolvedThisWeek = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
    return actualIssues.filter((issue) => {
      if (issue.status !== "Done" || !issue.resolvedAt) return false;
      const resolvedAt = new Date(issue.resolvedAt);
      return !Number.isNaN(resolvedAt.getTime()) && resolvedAt >= startOfWeek;
    }).length;
  }, [actualIssues]);
  const actualOverviewCards = [
    { label: "Open bugs", value: actualIssues.filter((issue) => issue.status !== "Draft" && issue.status !== "Done").length, change: "Live", note: "Issues not yet resolved", icon: "circle-dot" as const },
    { label: "Critical issues", value: issuesByPriority.find((issue) => issue.priority === "Critical")?.count ?? 0, change: "Tier 1", note: "Criticality: Tier 1", icon: "shield-alert" as const },
    { label: "In progress", value: actualIssues.filter((issue) => issue.status === "Investigating" || issue.status === "In review").length, change: "Live", note: "Investigating or in review", icon: "git-branch" as const },
    { label: "Resolved this week", value: resolvedThisWeek, change: "This week", note: "Issues moved to Done", icon: "sparkles" as const },
  ];

  const actualStatusChartConfig = useMemo(() => ({
    total: { label: "Issues", color: "var(--color-chart-1)" },
    ...Object.fromEntries(issuesByStatus.map(({ status, fill }) => [status, { label: status, color: fill }])),
  }) satisfies ChartConfig, [issuesByStatus]);
  const busiestTeam = issuesByTeam[0];
  const busiestStatus = [...issuesByStatus].sort((left, right) => right.total - left.total)[0];

  useEffect(() => {
    let active = true;
    fetch("/api/kanban", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Unable to load Kanban cards"))))
      .then((data: unknown) => {
        if (active && Array.isArray(data)) {
          setKanbanCards(data.filter((card): card is KanbanCardRecord =>
            typeof card?.id === "string" && typeof card?.status === "string",
          ));
        }
      })
      .catch(() => {
        if (active) setKanbanCards([]);
      })
      .finally(() => {
        if (active) setKanbanLoading(false);
      });

    return () => { active = false; };
  }, []);

  const kanbanByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const card of kanbanCards) counts.set(card.status, (counts.get(card.status) ?? 0) + 1);
    const known = KANBAN_STATUS_ORDER.filter((status) => counts.has(status));
    const custom = [...counts.keys()].filter((status) => !KANBAN_STATUS_ORDER.includes(status));
    return [...known, ...custom].map((status) => ({ status, cards: counts.get(status) ?? 0 }));
  }, [kanbanCards]);
  const watchlistPageCount = Math.ceil(urgentWatchlist.length / WATCHLIST_PAGE_SIZE);
  const watchlistStartIndex = (watchlistPage - 1) * WATCHLIST_PAGE_SIZE;
  const paginatedWatchlist = urgentWatchlist.slice(
    watchlistStartIndex,
    watchlistStartIndex + WATCHLIST_PAGE_SIZE,
  );

  return (
    <AppShell
      activeNav="overview"
      eyebrow="Sprint board"
      title="Product Quality Dashboard"
      toolbar={
        <div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Issue monitoring and triage</h2>
            <p className="text-sm text-muted-foreground">
              Pantau daftar issue, prioritas, dan workflow triage dalam satu tampilan.
            </p>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {actualOverviewCards.map((card) => {
          const Icon = iconMap[card.icon];

          return (
            <Card key={card.label} className="h-full">
              <CardHeader className="h-full">
                <div className="flex h-full items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <CardDescription className="truncate font-semibold">
                      {card.label}
                    </CardDescription>

                    <CardDescription className="mt-1 truncate">
                      {card.note}
                    </CardDescription>

                    <div className="mt-3 flex items-center gap-3">
                      <CardTitle className="text-4xl leading-none">
                        {issuesLoading ? "—" : card.value}
                      </CardTitle>

                      <Badge variant="secondary" className="translate-y-0.5">
                        {card.change}
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

      <Tabs className="mt-6 gap-4" defaultValue="active">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Issue flow</h2>
            <p className="text-sm text-muted-foreground">Shared components are already wired for cards, tables, dialogs, filters, and navigation.</p>
          </div>
          <TabsList variant="line">
            <TabsTrigger value="active">Active sprint</TabsTrigger>
            <TabsTrigger value="triage">Triage queue</TabsTrigger>
            <TabsTrigger value="resolved">Recently resolved</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Issue by team</CardTitle>
              </CardHeader>
              <CardContent>
                {issuesLoading ? <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">Loading issue data…</div> : !issuesByTeam.length ? <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">No issues to display.</div> : (
                <ChartContainer className="h-55 w-full" config={teamChartConfig}>
                  <BarChart accessibilityLayer data={issuesByTeam} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} dataKey="team" tickLine={false} tickMargin={10} />
                    <YAxis tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => [`${value} issues`, "Issue count"]} hideLabel />} />
                    <Bar dataKey="total" radius={10}>
                      {issuesByTeam.map((entry) => (
                        <Cell key={entry.team} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
                <span>{issuesLoading ? "Loading current workload…" : busiestTeam ? `${busiestTeam.team} has the most assigned issues.` : "No assigned issues yet."}</span>
                {busiestTeam ? <Badge variant="secondary">{busiestTeam.total} issues</Badge> : null}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="mx-auto h-55 w-full max-w-60" config={priorityChartConfig}>
                  <PieChart accessibilityLayer>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => {
                            const priorityName = String(name) as PriorityKey;
                            return [`${value} issues`, getPriorityLabel(priorityName)];
                          }}
                          hideIndicator
                        />
                      }
                    />
                    <Pie data={issuesByPriority} dataKey="count" innerRadius={54} outerRadius={82} nameKey="priority" strokeWidth={6}>
                      {issuesByPriority.map((entry) => (
                        <Cell key={entry.priority} fill={entry.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                            return null;
                          }

                          return (
                            <text fill="currentColor" textAnchor="middle" x={viewBox.cx} y={(viewBox.cy ?? 0) - 10}>
                              <tspan fill="var(--foreground)" fontSize="34" fontWeight="700" x={viewBox.cx} y={(viewBox.cy ?? 0) - 10}>
                                {totalIssues}
                              </tspan>
                              <tspan fill="var(--muted-foreground)" fontSize="13" fontWeight="500" x={viewBox.cx} y={(viewBox.cy ?? 0) + 10}>
                                total issues
                              </tspan>
                            </text>
                          );
                        }}
                      />
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="priority" className="flex-wrap gap-3 pt-6" />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
                <span>{urgentIssues} items are still in Critical or High priority.</span>
                <Badge variant="outline">Needs daily triage</Badge>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issue by status</CardTitle>
              </CardHeader>
              <CardContent>
                {issuesLoading ? <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">Loading issue data…</div> : !issuesByStatus.length ? <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">No issues to display.</div> : (
                <ChartContainer className="h-55 w-full" config={actualStatusChartConfig}>
                  <BarChart accessibilityLayer data={issuesByStatus} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis allowDecimals={false} axisLine={false} tickLine={false} type="number" hide />
                    <YAxis tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} dataKey="status" tickLine={false} tickMargin={10} type="category" width={84} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => [`${value} issues`, "Status load"]} hideLabel />} />
                    <Bar dataKey="total" radius={10}>
                      {issuesByStatus.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
                <span>{issuesLoading ? "Loading current status counts…" : busiestStatus ? `${busiestStatus.status} currently holds the most issues.` : "No issues yet."}</span>
                {busiestStatus ? <Badge variant="secondary">{busiestStatus.total} issues</Badge> : null}
              </CardFooter>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Kanban by status</CardTitle>
              </CardHeader>
              <CardContent>
                {kanbanLoading ? (
                  <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">Loading Kanban data…</div>
                ) : kanbanByStatus.length ? (
                  <ChartContainer className="h-55 w-full" config={kanbanChartConfig}>
                    <LineChart accessibilityLayer data={kanbanByStatus} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="status" tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} tickLine={false} tickMargin={10} />
                      <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} tickLine={false} width={28} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => [`${value} cards`, "Kanban"]} hideLabel />} />
                      <Line dataKey="cards" type="monotone" stroke="var(--color-cards)" strokeWidth={3} dot={{ fill: "var(--color-cards)", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">No Kanban cards to display.</div>
                )}
              </CardContent>
              <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
                <span>Live snapshot from the Kanban board.</span>
                <Badge variant="secondary">{kanbanCards.length} cards</Badge>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issue watchlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Assignee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!issuesLoading && paginatedWatchlist.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No urgent issues to display.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {paginatedWatchlist.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <p className="font-medium">{issue.id}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(issue.criticality === "Tier 1 - Critical" ? "Critical" : "High")}>
                            {issue.criticality === "Tier 1 - Critical" ? "Critical" : "High"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(issue.status)}>{issue.status}</Badge>
                        </TableCell>
                        <TableCell>{issue.team || "Unassigned"}</TableCell>
                        <TableCell>
                          <Avatar size="sm">
                            <AvatarFallback>{issue.pic?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "—"}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {issuesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading issue watchlist…</p>
                ) : watchlistPageCount > 1 ? (
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {watchlistStartIndex + 1}-{Math.min(watchlistStartIndex + WATCHLIST_PAGE_SIZE, urgentWatchlist.length)} of {urgentWatchlist.length} urgent issues
                    </p>
                    <TablePagination
                      className="mx-0 w-auto justify-start sm:justify-end"
                      currentPage={watchlistPage}
                      totalPages={watchlistPageCount}
                      onPageChange={setWatchlistPage}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="triage">
          <Card>
            <CardHeader>
              <CardTitle>Triage queue</CardTitle>
              <CardDescription>Use this tab as the starting point for backlog review or a dedicated `/triage` page.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>7 unassigned</Badge>
              <Badge variant="secondary">3 waiting for QA</Badge>
              <Badge variant="outline">2 blocked by backend logs</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardHeader>
              <CardTitle>Recently resolved</CardTitle>
              <CardDescription>Shared UI is ready for velocity reports, release summaries, or changelog views.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border p-4">
                <p className="font-medium">BUG-196 fixed in `v2.8.0`</p>
                <p className="text-sm text-muted-foreground">Session timeout banner now respects retry state and no longer overlaps the editor toolbar.</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="font-medium">BUG-188 fixed in `v2.7.9`</p>
                <p className="text-sm text-muted-foreground">Webhook delivery retries now show consistent timestamps across UTC and local user settings.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
