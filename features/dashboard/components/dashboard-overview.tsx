"use client";

import { useState } from "react";
import { CircleDot, GitBranch, ListFilter, ShieldAlert, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { issues, overviewCards, priorityVariant, statusVariant } from "@/features/bug-tracker/data/bug-tracker-data";

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
  Frontend: {
    label: "Frontend",
    color: "var(--color-chart-1)",
  },
  Platform: {
    label: "Platform",
    color: "var(--color-chart-2)",
  },
  Core: {
    label: "Core",
    color: "var(--color-chart-3)",
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

const statusChartConfig = {
  total: {
    label: "Issues",
    color: "var(--color-chart-5)",
  },
  Backlog: {
    label: "Backlog",
    color: "var(--color-chart-5)",
  },
  Ready: {
    label: "Ready",
    color: "var(--color-chart-2)",
  },
  Investigating: {
    label: "Investigating",
    color: "var(--color-chart-4)",
  },
  "In review": {
    label: "In review",
    color: "var(--color-chart-1)",
  },
  Done: {
    label: "Done",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

const priorityOrder = ["Critical", "High", "Medium", "Low"] as const;
const statusOrder = ["Backlog", "Ready", "Investigating", "In review", "Done"] as const;
type PriorityKey = (typeof priorityOrder)[number];

const issuesByTeam = Object.entries(
  issues.reduce<Record<string, number>>((accumulator, issue) => {
    accumulator[issue.team] = (accumulator[issue.team] ?? 0) + 1;
    return accumulator;
  }, {}),
)
  .map(([team, total]) => ({
    team,
    total,
    fill: `var(--color-${team})`,
  }))
  .sort((left, right) => right.total - left.total);

const issuesByPriority = priorityOrder.map((priority) => ({
  priority,
  count: issues.filter((issue) => issue.priority === priority).length,
  fill: `var(--color-${priority})`,
}));

const issuesByStatus = statusOrder.map((status) => ({
  status,
  total: issues.filter((issue) => issue.status === status).length,
  fill: statusChartConfig[status].color,
}));

const totalIssues = issues.length;
const urgentIssues = issues.filter((issue) => issue.priority === "Critical" || issue.priority === "High").length;
const busiestTeam = issuesByTeam[0];
const urgentWatchlist = issues.filter((issue) => issue.priority === "Critical" || issue.priority === "High");
const busiestStatus = [...issuesByStatus].sort((left, right) => right.total - left.total)[0];
const WATCHLIST_PAGE_SIZE = 5;

function getPriorityLabel(priority: PriorityKey) {
  return priorityChartConfig[priority].label ?? priority;
}

export function DashboardOverview() {
  const [watchlistPage, setWatchlistPage] = useState(1);
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Issue monitoring and triage</h2>
            <p className="text-sm text-muted-foreground">
              Pantau daftar issue, prioritas, dan workflow triage dalam satu tampilan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select defaultValue="all">
              <SelectTrigger>
                <ListFilter />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="review">In review</SelectItem>
                <SelectItem value="done">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="sprint-12">
              <SelectTrigger>
                <SelectValue placeholder="Sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sprint-12">Sprint 12</SelectItem>
                <SelectItem value="sprint-11">Sprint 11</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
              </SelectContent>
            </Select>
            <AvatarGroup>
              {["RA", "MI", "AL"].map((name) => (
                <Avatar key={name} size="sm">
                  <AvatarFallback>{name}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {overviewCards.map((card) => {
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
                        {card.value}
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
                <CardDescription>Current workload split across squads for the active sprint board.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-55 w-full" config={teamChartConfig}>
                  <BarChart accessibilityLayer data={issuesByTeam} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} axisLine={false} dataKey="team" tickLine={false} tickMargin={10} />
                    <YAxis tick={{ fill: "var(--foreground)", fillOpacity: 0.85 }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => [`${value} issues`, "Open load"]} hideLabel />} />
                    <Bar dataKey="total" radius={10}>
                      {issuesByTeam.map((entry) => (
                        <Cell key={entry.team} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
                <span>{busiestTeam.team} has the heaviest queue right now.</span>
                <Badge variant="secondary">{busiestTeam.total} issues</Badge>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority breakdown</CardTitle>
                <CardDescription>Donut view to spot how much of the board needs urgent attention.</CardDescription>
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
                <CardDescription>Snapshot of how the board is distributed from backlog to done.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-55 w-full" config={statusChartConfig}>
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
              </CardContent>
              <CardFooter className="justify-between gap-3 text-sm text-muted-foreground">
                <span>{busiestStatus.status} currently holds the most items.</span>
                <Badge variant="secondary">{busiestStatus.total} issues</Badge>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader>
                <CardTitle>Issue watchlist</CardTitle>
                <CardDescription>Focus list for urgent items only, without medium and low noise.</CardDescription>
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
                    {paginatedWatchlist.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{issue.id}</p>
                            <p className="max-w-xl text-sm text-muted-foreground">{issue.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(issue.priority)}>{issue.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(issue.status)}>{issue.status}</Badge>
                        </TableCell>
                        <TableCell>{issue.team}</TableCell>
                        <TableCell>
                          <Avatar size="sm">
                            <AvatarFallback>{issue.assignee}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {watchlistPageCount > 1 ? (
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

            <Card className="self-start pb-0">
              <CardHeader>
                <CardTitle>Triage notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Crash cluster spike</p>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Android attachment uploads increased error volume by 38% after the latest rollout.</p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Quick handoff</p>
                  <Textarea defaultValue="Need reproduction steps from QA and API logs from the upload gateway before the daily sync." rows={6} />
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-xs text-muted-foreground">Last synced 8 minutes ago</span>
                <Button variant="outline">Share update</Button>
              </CardFooter>
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
