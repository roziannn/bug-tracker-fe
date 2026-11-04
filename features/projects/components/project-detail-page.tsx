"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Flag, Gauge, Hash, Link2, Pencil, Server, Tag, UserRound } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/features/projects/components/priority-badge";
import { ProjectGantt, type TimelinePhase } from "@/features/projects/components/project-gantt";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { requestJson } from "@/lib/request";
import type { ProjectDetail } from "@/types";

type State = { status: "loading" } | { status: "notFound" } | { status: "error" } | { status: "ready"; project: ProjectDetail };

function BackButton() {
  return (
    <Button nativeButton={false} render={<Link href="/projects" />} variant="outline">
      <ArrowLeft /> Back to projects
    </Button>
  );
}

// `id` adalah NewId (GUID) project.
export function ProjectDetailPage({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [savingPhaseId, setSavingPhaseId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404) return { status: "notFound" } as const;
        if (!res.ok) return { status: "error" } as const;
        return { status: "ready", project: (await res.json()) as ProjectDetail } as const;
      })
      .catch(() => ({ status: "error" }) as const)
      .then((next) => {
        if (!cancelled) setState(next);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const project = state.status === "ready" ? state.project : null;
  const phases = useMemo<TimelinePhase[]>(
    () =>
      (project?.Phases ?? []).map((phase) => ({
        id: String(phase.Id),
        name: phase.Name,
        start: phase.StartDate,
        end: phase.EndDate,
      })),
    [project]
  );

  async function movePhase(phaseId: string, start: string, end: string) {
    if (!project || savingPhaseId) return;
    const phase = project.Phases.find((item) => String(item.Id) === phaseId);
    if (!phase) return;

    setSavingPhaseId(phaseId);
    setState({
      status: "ready",
      project: {
        ...project,
        Phases: project.Phases.map((item) =>
          String(item.Id) === phaseId ? { ...item, StartDate: start, EndDate: end } : item
        ),
      },
    });

    try {
      await requestJson(`/api/projects/${encodeURIComponent(id)}/phases/${phaseId}`, "PATCH", { start, end });
    } catch (error) {
      setState((current) =>
        current.status === "ready"
          ? {
              status: "ready",
              project: {
                ...current.project,
                Phases: current.project.Phases.map((item) =>
                  String(item.Id) === phaseId ? { ...item, StartDate: phase.StartDate, EndDate: phase.EndDate } : item
                ),
              },
            }
          : current
      );
      appToast.error({
        title: "Failed to move phase",
        description: error instanceof Error ? error.message : "The timeline dates could not be saved.",
      });
    } finally {
      setSavingPhaseId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <AppShell
        activeNav="projects"
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Project Detail" }]}
        eyebrow="Project routing"
        title="Project Detail"
      >
        <div className="space-y-6" aria-hidden="true">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell
        activeNav="projects"
        breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Project Detail" }]}
        eyebrow="Project routing"
        title="Project Detail"
      >
        <Card>
          <CardHeader>
            <CardTitle>{state.status === "notFound" ? "Project not found" : "Failed to load project"}</CardTitle>
            <CardDescription>
              {state.status === "notFound"
                ? `There is no project with id ${id}.`
                : "Something went wrong while loading this project, please try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BackButton />
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeNav="projects"
      breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: project.Name }]}
      eyebrow="Project routing"
      title={project.Name}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Project detail</h2>
            <p className="text-sm text-muted-foreground">Owner, tags, timeline, repositories, and environment URLs of this project.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BackButton />
            <Button nativeButton={false} render={<Link href={`/projects/${project.NewId}/edit`} />}>
              <Pencil /> Edit
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{project.Name}</CardTitle>
            <CardDescription>{project.Description || "No description."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-5 pt-0 text-sm md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Hash className="size-4" />
                Project ID
              </p>
              <Badge className="max-w-full justify-start break-all font-mono" variant="outline">
                {project.NewId}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <UserRound className="size-4" />
                Owner
              </p>
              <p className="font-medium">{project.OwnerName}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Gauge className="size-4" />
                Priority
              </p>
              <PriorityBadge priority={project.Priority} />
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Flag className="size-4" />
                Go Live date
              </p>
              <p className="font-medium">{project.GoLiveDate ? formatDate(project.GoLiveDate) : "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CalendarDays className="size-4" />
                Created
              </p>
              <p className="font-medium">
                {formatDate(project.CreatedDate)} by {project.CreatedBy || "System"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Tag className="size-4" />
                Tags
              </p>
              {project.Tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {project.Tags.map((tag) => (
                    <Badge key={tag.Id} variant="secondary">
                      {tag.Name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Drag a phase bar to move its dates. The timeline adjusts automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectGantt
              phases={phases}
              onPhaseMove={movePhase}
              savingPhaseId={savingPhaseId}
              emptyMessage="This project has no timeline phases."
            />
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Repositories</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {project.Repositories.length ? (
                project.Repositories.map((repository) => (
                  <p key={repository} className="flex items-center gap-2 text-sm">
                    <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    <span className="break-all font-mono">{repository}</span>
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No repositories added.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Environment URLs</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {project.Environments.length ? (
                project.Environments.map((item) => (
                  <div key={item.Environment} className="grid gap-0.5 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-muted-foreground">
                      <Server className="size-4" />
                      {item.Environment}
                    </p>
                    <a
                      className="break-all font-mono text-primary underline-offset-4 hover:underline"
                      href={item.Url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.Url}
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No environment URLs added.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
