"use client";

import { useMemo, useState } from "react";
import { Copy, Search, Terminal } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projectLogs, type ProjectLogEntry, type ProjectLogLevel } from "@/features/projects/data/project-log-data";
import { appToast } from "@/lib/app-toast";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

type LevelFilter = ProjectLogLevel | "all";

const projectNames = Array.from(new Set(projectLogs.map((log) => log.project)));

const levelStyles: Record<ProjectLogLevel, string> = {
  FATAL: "border-red-500/40 bg-red-500/15 text-red-500",
  ERROR: "border-red-400/30 bg-red-400/10 text-red-400",
  WARN: "border-amber-500/30 bg-amber-500/10 text-amber-500",
};

function LevelBadge({ level }: { level: ProjectLogLevel }) {
  return (
    <Badge variant="outline" className={cn("font-mono", levelStyles[level])}>
      {level}
    </Badge>
  );
}

const LOG_LINE = /^(\S+)(\s+)(FATAL|ERROR|WARN|INFO|DEBUG)(\s.*)?$/;

const textTones: Record<string, string> = {
  FATAL: "font-semibold text-red-400",
  ERROR: "text-red-400",
  WARN: "text-amber-300",
  INFO: "text-zinc-400",
  DEBUG: "text-zinc-500",
};

// Satu baris terminal: waktu abu-abu, level berwarna, stack trace merah redup.
function TerminalLine({ line }: { line: string }) {
  const match = LOG_LINE.exec(line);

  if (match) {
    const [, time, gap, level, rest = ""] = match;
    return (
      <div className="whitespace-pre-wrap break-words">
        <span className="text-zinc-600">{time}</span>
        {gap}
        <span className={cn(textTones[level], level === "FATAL" && "rounded bg-red-500/20 px-1")}>{level}</span>
        <span className={textTones[level]}>{rest}</span>
      </div>
    );
  }

  const isTrace = /^\s+at\s/.test(line);
  return (
    <div className={cn("whitespace-pre-wrap break-words", isTrace ? "text-red-300/60" : "text-red-400")}>{line}</div>
  );
}

function LogTerminal({ entry }: { entry: ProjectLogEntry }) {
  async function copyLog() {
    try {
      await navigator.clipboard.writeText(entry.lines.join("\n"));
      appToast.success({ title: "Log copied", description: entry.id });
    } catch {
      appToast.error({ title: "Failed to copy log", description: "Clipboard is not available in this browser." });
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-red-500/30 bg-[#0b0d10] shadow-lg shadow-red-950/20">
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-3 rounded-full bg-red-500" />
          <span className="size-3 rounded-full bg-amber-400" />
          <span className="size-3 rounded-full bg-emerald-500" />
        </div>
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-400">
          {entry.service}@{entry.environment.toLowerCase()} — {entry.id}
        </p>
        <Button
          variant="ghost"
          size="xs"
          className="text-zinc-300 hover:bg-white/10 hover:text-white"
          onClick={copyLog}
        >
          <Copy />
          Copy
        </Button>
      </div>

      <div className="max-h-[28rem] space-y-0.5 overflow-auto p-4 font-mono text-xs leading-relaxed" role="log" aria-label={`Log ${entry.id}`}>
        <p className="pb-2 text-zinc-500">$ tail -n {entry.lines.length} /var/log/{entry.service}.log</p>
        {entry.lines.map((line, index) => (
          <TerminalLine key={index} line={line} />
        ))}
        <p className="pt-2 text-zinc-500">
          $ <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-pulse bg-zinc-400" />
        </p>
      </div>
    </div>
  );
}

export function ProjectLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projectLogs.filter((log) => {
      const matchesProject = projectFilter === "all" || log.project === projectFilter;
      const matchesLevel = levelFilter === "all" || log.level === levelFilter;
      const matchesQuery =
        !query || [log.id, log.project, log.service, log.message].some((value) => value.toLowerCase().includes(query));

      return matchesProject && matchesLevel && matchesQuery;
    });
  }, [levelFilter, projectFilter, searchQuery]);

  // Tanpa pilihan, log pertama yang tampil ditampilkan di terminal.
  const selected = filteredLogs.find((log) => log.id === selectedId) ?? filteredLogs[0] ?? null;
  const count = (level: ProjectLogLevel) => projectLogs.filter((log) => log.level === level).length;

  return (
    <AppShell
      activeNav="projects"
      title="Project Log"
      breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Project Log" }]}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Project error logs</h2>
            <p className="text-sm text-muted-foreground">Pick a log entry to see its terminal output.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-full min-w-0 items-center gap-2 rounded-xl border bg-card px-3 sm:w-auto sm:min-w-64">
              <Search className="size-4 text-muted-foreground" />
              <Input
                aria-label="Search project logs"
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                placeholder="Search id, project, service, or message..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value ?? "all")}>
              <SelectTrigger className="h-9 w-auto min-w-28 px-2.5">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all projects</SelectItem>
                {projectNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={(value) => setLevelFilter((value ?? "all") as LevelFilter)}>
              <SelectTrigger className="h-9 w-auto min-w-24 px-2.5">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all levels</SelectItem>
                <SelectItem value="FATAL">FATAL</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {(["FATAL", "ERROR", "WARN"] as const).map((level) => (
            <Card key={level} size="sm">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{level === "WARN" ? "Warnings" : `${level[0]}${level.slice(1).toLowerCase()} logs`}</p>
                  <p className="text-2xl font-semibold tabular-nums">{count(level)}</p>
                </div>
                <LevelBadge level={level} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardContent>
              <div className="max-h-[36rem] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const isSelected = log.id === selected?.id;

                      return (
                        <TableRow
                          key={log.id}
                          data-state={isSelected ? "selected" : undefined}
                          className="cursor-pointer"
                          onClick={() => setSelectedId(log.id)}
                        >
                          <TableCell>
                            <LevelBadge level={log.level} />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{log.project}</p>
                            <p className="font-mono text-xs text-muted-foreground">{log.service}</p>
                          </TableCell>
                          <TableCell className="max-w-64">
                            <p className="truncate" title={log.message}>
                              {log.message}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedId(log.id);
                              }}
                            >
                              <Terminal />
                              Show
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          No logs match your filters.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3 lg:sticky lg:top-4 lg:col-span-2">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <LevelBadge level={selected.level} />
                  <Badge variant="outline">{selected.environment}</Badge>
                  <span className="text-sm font-medium">{selected.project}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selected.message}</p>
                <LogTerminal key={selected.id} entry={selected} />
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Select a log entry to see its terminal output.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
