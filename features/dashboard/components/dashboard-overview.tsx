"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Label, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { priorityVariant, statusVariant } from "@/features/bug-tracker/data/bug-tracker-data";

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
  project: string | null;
  criticality: string;
  resolvedAt: string | null;
};
type ServiceRequestSummary = {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  requester: string | null;
  project: string | null;
  createdAt: string;
};

const serviceRequestChartConfig = {
  requests: { label: "Requests", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

function getPriorityLabel(priority: PriorityKey) {
  return priorityChartConfig[priority].label ?? priority;
}

export function DashboardOverview() {
  const [watchlistPage, setWatchlistPage] = useState(1);
  const [kanbanCards, setKanbanCards] = useState<KanbanCardRecord[]>([]);
  const [kanbanLoading, setKanbanLoading] = useState(true);
  const [actualIssues, setActualIssues] = useState<ActualIssueSummary[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestSummary[]>([]);
  const [serviceRequestsLoading, setServiceRequestsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/service-requests", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Unable to load service requests"))))
      .then((data: unknown) => {
        if (active && Array.isArray(data)) {
          setServiceRequests(data.filter((row): row is ServiceRequestSummary =>
            typeof row?.id === "string" && typeof row?.number === "string" &&
            typeof row?.title === "string" && typeof row?.type === "string" &&
            typeof row?.status === "string" && typeof row?.priority === "string" &&
            (typeof row?.requester === "string" || row?.requester === null) &&
            (typeof row?.project === "string" || row?.project === null) &&
            typeof row?.createdAt === "string",
          ));
        }
      })
      .catch(() => { if (active) setServiceRequests([]); })
      .finally(() => { if (active) setServiceRequestsLoading(false); });
    return () => { active = false; };
  }, []);

  const requestsByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of serviceRequests) counts.set(request.status, (counts.get(request.status) ?? 0) + 1);
    return [...counts].map(([status, requests]) => ({ status, requests }));
  }, [serviceRequests]);
  const requestsByPriority = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of serviceRequests) counts.set(request.priority, (counts.get(request.priority) ?? 0) + 1);
    return [...counts].map(([priority, requests]) => ({ priority, requests }));
  }, [serviceRequests]);
  const requestsByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const request of serviceRequests) counts.set(request.type, (counts.get(request.type) ?? 0) + 1);
    return [...counts].map(([type, requests]) => ({ type, requests }));
  }, [serviceRequests]);
  const recentRequests = useMemo(() => [...serviceRequests]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 8), [serviceRequests]);

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
            (typeof issue?.project === "string" || issue?.project === null) &&
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

  const urgentWatchlist = useMemo(() => actualIssues
    .filter((issue) => issue.criticality === "Tier 1 - Critical" || issue.criticality === "Tier 2 - Major")
    .sort((left, right) => {
      const leftRank = left.criticality === "Tier 1 - Critical" ? 0 : 1;
      const rightRank = right.criticality === "Tier 1 - Critical" ? 0 : 1;
      return leftRank - rightRank;
    }), [actualIssues]);
  const actualStatusChartConfig = useMemo(() => ({
    total: { label: "Issues", color: "var(--color-chart-1)" },
    ...Object.fromEntries(issuesByStatus.map(({ status, fill }) => [status, { label: status, color: fill }])),
  }) satisfies ChartConfig, [issuesByStatus]);

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
    >
      <Tabs className="gap-4" defaultValue="issues">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Overview</h2>
          </div>
          <TabsList variant="line">
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="service-requests">Service Requests</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="issues">
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
                      <TableHead>Project</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!issuesLoading && paginatedWatchlist.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
                        <TableCell>{issue.project || "No project"}</TableCell>
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

        <TabsContent value="service-requests" className="space-y-4">
          <div className="grid grid-cols-2 gap-6 border-b pb-5 sm:grid-cols-4">
            {[
              { label: "Total requests", value: serviceRequests.length },
              { label: "Open requests", value: serviceRequests.filter((request) => !["Done", "Rejected", "Cancelled"].includes(request.status)).length },
              { label: "In progress", value: serviceRequests.filter((request) => ["In Progress", "In Review"].includes(request.status)).length },
              { label: "Completed", value: serviceRequests.filter((request) => request.status === "Done").length },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-3xl font-semibold tracking-tight">{serviceRequestsLoading ? "—" : item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[
              { title: "Requests by status", data: requestsByStatus, key: "status" },
              { title: "Requests by priority", data: requestsByPriority, key: "priority" },
              { title: "Requests by type", data: requestsByType, key: "type" },
            ].map((chart) => (
              <Card key={chart.title}>
                <CardHeader><CardTitle>{chart.title}</CardTitle></CardHeader>
                <CardContent>
                  {serviceRequestsLoading ? <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">Loading service request data…</div> : !chart.data.length ? <div className="flex h-55 items-center justify-center text-sm text-muted-foreground">No service requests to display.</div> : (
                    <ChartContainer className="h-55 w-full" config={serviceRequestChartConfig}>
                      <BarChart accessibilityLayer data={chart.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={chart.key} tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} tickLine={false} tickMargin={8} />
                        <YAxis allowDecimals={false} tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} tickLine={false} width={28} />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="requests" fill="var(--color-requests)" radius={8} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Recent service requests</CardTitle><CardDescription>Latest requests submitted to the team.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Priority</TableHead><TableHead>Requester</TableHead><TableHead>Project</TableHead></TableRow></TableHeader>
                <TableBody>
                  {!serviceRequestsLoading && !recentRequests.length ? <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No service requests to display.</TableCell></TableRow> : null}
                  {recentRequests.map((request) => <TableRow key={request.id}><TableCell><p className="font-medium">{request.number}</p><p className="text-xs text-muted-foreground">{request.title}</p></TableCell><TableCell>{request.type}</TableCell><TableCell><Badge variant="outline">{request.status}</Badge></TableCell><TableCell>{request.priority}</TableCell><TableCell>{request.requester || "—"}</TableCell><TableCell>{request.project || "—"}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
