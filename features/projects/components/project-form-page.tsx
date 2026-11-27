"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectGantt, type TimelinePhase } from "@/features/projects/components/project-gantt";
import { DEFAULT_PRIORITY, PROJECT_PRIORITIES, type ProjectPriority } from "@/features/projects/data/priorities";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { appToast } from "@/lib/app-toast";
import { DAY_MS, formatDate, parseDateOnly, toDateOnly } from "@/lib/date";
import type { Category, Paged, ProjectDetail, User } from "@/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error();
  return (await res.json()) as T;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const DATE_MIN = "2000-01-01";
const DATE_MAX = "2100-12-31";
const TECH_STACK_CATEGORIES = ["Database", "Frontend", "Backend"] as const;
type TechStackCategory = (typeof TECH_STACK_CATEGORIES)[number];

function formatDateRange(start: string, end: string) {
  if (!start || !end) return `${start ? formatDate(start) : "Start date"} – ${end ? formatDate(end) : "End date"}`;
  const startParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  const endParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end);
  if (!startParts || !endParts) return `${formatDate(start)} – ${formatDate(end)}`;

  const [, startYear, startMonth, startDay] = startParts;
  const [, endYear, endMonth, endDay] = endParts;
  if (startYear === endYear && startMonth === endMonth) {
    const monthName = formatDate(start).split(" ")[1];
    return `${Number(startDay)}–${Number(endDay)} ${monthName} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${formatDate(start).replace(` ${startYear}`, "")} – ${formatDate(end)}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

// Salah satu isian phase yang kurang (hanya dicek setelah tombol Create ditekan).
function missingField(phase: TimelinePhase): string | null {
  if (!phase.name.trim()) return "Enter a phase name.";
  if (parseDateOnly(phase.start) === null) return "Pick a start date.";
  if (parseDateOnly(phase.end) === null) return "Pick an end date.";
  return null;
}

// Tanggal selesai sebelum tanggal mulai: langsung ditampilkan tanpa menunggu submit.
function orderError(phase: TimelinePhase): string | null {
  const start = parseDateOnly(phase.start);
  const end = parseDateOnly(phase.end);
  return start !== null && end !== null && end < start ? "End date must be on or after the start date." : null;
}

function ProjectForm({ project }: { project?: ProjectDetail }) {
  const router = useRouter();
  const isEdit = project !== undefined;
  const [name, setName] = useState(project?.Name ?? "");
  const [ownerId, setOwnerId] = useState<string | null>(project ? String(project.OwnerId) : null);
  const [tags, setTags] = useState<string[]>(project?.Tags.map((tag) => tag.Name) ?? []);
  const [repositories, setRepositories] = useState(() =>
    project?.Repositories.length
      ? project.Repositories.map((value, index) => ({ id: `repo-${index}`, value }))
      : [{ id: "repo-0", value: "" }]
  );
  const [techStack, setTechStack] = useState(() =>
    project?.TechStack?.length
      ? project.TechStack.map((item, index) => ({ id: `stack-${index}`, category: item.category as TechStackCategory, technology: item.technology, version: item.version ?? "" }))
      : []
  );
  const [goLiveDate, setGoLiveDate] = useState(project?.GoLiveDate ?? "");
  const [description, setDescription] = useState(project?.Description ?? "");
  const [priority, setPriority] = useState<ProjectPriority>(
    PROJECT_PRIORITIES.find((item) => item === project?.Priority) ?? DEFAULT_PRIORITY
  );
  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries((project?.Environments ?? []).map((item) => [item.Environment, item.Url]))
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Nama project yang ditolak server karena sudah dipakai; dipakai untuk pesan di bawah field nama.
  const [takenName, setTakenName] = useState<string | null>(null);
  const [phases, setPhases] = useState<TimelinePhase[]>(() =>
    (project?.Phases ?? []).map((phase, index) => ({
      id: `phase-${index}`,
      name: phase.Name,
      start: phase.StartDate,
      end: phase.EndDate,
      actualStart: phase.ActualStartDate ?? "",
      actualEnd: phase.ActualEndDate ?? "",
    }))
  );
  const nextPhaseId = useRef(project?.Phases.length ?? 0);
  const nextRepositoryId = useRef(Math.max(1, project?.Repositories.length ?? 1));
  const nextTechStackId = useRef(Math.max(1, project?.TechStack?.length ?? 1));

  // null = masih dimuat
  const [users, setUsers] = useState<User[] | null>(null);
  const [tagOptions, setTagOptions] = useState<Category[] | null>(null);
  const [environments, setEnvironments] = useState<string[] | null>(null);

  useEffect(() => {
    getJson<Paged<User>>("/api/users?pageSize=100")
      .then((body) => setUsers(body.data.filter((user) => user.IsActive)))
      .catch(() => {
        setUsers([]);
        appToast.error({ title: "Failed to load users", description: "Something went wrong, please try again." });
      });

    getJson<Category[]>("/api/categories?category=teams-domain")
      .then((items) => {
        // Tag yang sudah dipakai project tetap tampil walau nilainya sudah dinonaktifkan, supaya tidak hilang diam-diam saat disimpan.
        const used = new Set((project?.Tags ?? []).map((tag) => tag.Id));
        setTagOptions(items.filter((item) => item.IsActive || used.has(item.Id)));
      })
      .catch(() => {
        setTagOptions([]);
        appToast.error({ title: "Failed to load tags", description: "Something went wrong, please try again." });
      });

    getJson<string[]>("/api/env/environments")
      .then((names) => {
        const known = new Set(names.map((item) => item.toLowerCase()));
        const extra = (project?.Environments ?? []).map((item) => item.Environment).filter((item) => !known.has(item.toLowerCase()));
        setEnvironments([...names, ...extra]);
      })
      .catch(() => {
        setEnvironments([]);
        appToast.error({ title: "Failed to load environments", description: "Something went wrong, please try again." });
      });
  }, [project]);

  const ownerOptions = useMemo(() => {
    const options = (users ?? []).map((user) => ({
      value: String(user.Id),
      label: user.Name,
      description: user.RoleName ? `${user.Email} · ${user.RoleName}` : user.Email,
    }));

    // Owner saat ini tetap bisa dipilih walau akunnya sudah tidak aktif.
    if (project && users && !options.some((option) => option.value === String(project.OwnerId))) {
      options.push({ value: String(project.OwnerId), label: project.OwnerName, description: "Inactive user" });
    }
    return options;
  }, [project, users]);

  const nameError = submitted && !name.trim();
  const nameTaken = takenName !== null && name.trim().toLowerCase() === takenName.toLowerCase();
  const ownerError = submitted && !ownerId;
  const urlErrors = Object.fromEntries(
    (environments ?? []).map((env) => [env, (urls[env] ?? "").trim() !== "" && !isValidUrl(urls[env].trim())])
  ) as Record<string, boolean>;
  const hasUrlError = Object.values(urlErrors).some(Boolean);

  const validPhases = useMemo(() => phases.filter((phase) => !missingField(phase) && !orderError(phase)), [phases]);
  const phasesInvalid = phases.some((phase) => missingField(phase) || orderError(phase));
  const actualDatesInvalid = phases.some((phase) =>
    (Boolean(phase.actualStart) !== Boolean(phase.actualEnd)) ||
    (phase.actualStart && phase.actualEnd && parseDateOnly(phase.actualEnd)! < parseDateOnly(phase.actualStart)!)
  );

  // Repository yang sama dua kali: yang kedua ditandai.
  const repositoryKeys = repositories.map((item) => item.value.trim().toLowerCase());
  const isDuplicateRepository = (index: number) =>
    repositoryKeys[index] !== "" && repositoryKeys.indexOf(repositoryKeys[index]) !== index;
  const hasRepositoryError = repositories.some((_, index) => isDuplicateRepository(index));

  function addRepository() {
    setRepositories((current) => [...current, { id: `repo-${nextRepositoryId.current++}`, value: "" }]);
  }

  function updateRepository(id: string, value: string) {
    setRepositories((current) => current.map((item) => (item.id === id ? { ...item, value } : item)));
  }

  function removeRepository(id: string) {
    setRepositories((current) => {
      const next = current.filter((item) => item.id !== id);
      // Selalu sisakan satu isian kosong supaya field-nya tetap terlihat.
      return next.length ? next : [{ id: `repo-${nextRepositoryId.current++}`, value: "" }];
    });
  }

  function addTechStack() {
    setTechStack((current) => [...current, { id: `stack-${nextTechStackId.current++}`, category: "Database", technology: "", version: "" }]);
  }

  function updateTechStack(id: string, patch: Partial<{ category: TechStackCategory; technology: string; version: string }>) {
    setTechStack((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function removeTechStack(id: string) {
    setTechStack((current) => current.filter((item) => item.id !== id));
  }

  function addPhase() {
    // Phase baru dimulai sehari setelah phase sebelumnya selesai.
    const lastEnd = phases.length ? parseDateOnly(phases[phases.length - 1].end) : null;
    const start = lastEnd === null ? "" : toDateOnly(lastEnd + DAY_MS);
    setPhases((current) => [...current, { id: `phase-${nextPhaseId.current++}`, name: "", start, end: "", actualStart: "", actualEnd: "" }]);
  }

  function updatePhase(id: string, patch: Partial<TimelinePhase>) {
    setPhases((current) => current.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase)));
  }

  function removePhase(id: string) {
    setPhases((current) => current.filter((phase) => phase.id !== id));
  }

  function toggleTag(tagName: string, checked: boolean) {
    setTags((current) => (checked ? [...current, tagName] : current.filter((item) => item !== tagName)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (!name.trim() || !ownerId || hasUrlError || phasesInvalid || actualDatesInvalid || hasRepositoryError || nameTaken) {
      appToast.error({ title: "Check the form", description: "Fill in the required fields and fix the highlighted fields." });
      return;
    }

    if (techStack.some((item) => !item.technology.trim() || !item.version.trim())) {
      appToast.error({ title: "Check the form", description: "Enter both the technology and version for every stack." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/projects/${project.NewId}` : "/api/projects", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ownerId: Number(ownerId),
          description: description.trim(),
          priority,
          goLiveDate,
          tags: (tagOptions ?? []).filter((tag) => tags.includes(tag.Name)).map((tag) => tag.Id),
          repositories: repositories.map((item) => item.value.trim()).filter(Boolean),
          techStack: techStack.map(({ category, technology, version }) => ({ category, technology: technology.trim(), version: version.trim() })),
          environments: Object.fromEntries(
            Object.entries(urls)
              .map(([environment, url]) => [environment, url.trim()])
              .filter(([, url]) => url !== "")
          ),
          phases: validPhases.map((phase) => ({ name: phase.name.trim(), start: phase.start, end: phase.end, actualStart: phase.actualStart, actualEnd: phase.actualEnd })),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 409) setTakenName(name.trim());
        appToast.error({ title: isEdit ? "Failed to update project" : "Failed to create project", description: data?.error ?? "Something went wrong, please try again." });
        return;
      }

      appToast.success({ title: isEdit ? "Project updated" : "Project created", description: `${data.Name} was saved.` });
      router.push(isEdit ? `/projects/${project.NewId}` : "/projects");
    } catch {
      appToast.error({ title: isEdit ? "Failed to update project" : "Failed to create project", description: "Unable to reach the server, please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      activeNav="projects"
      breadcrumbs={
        isEdit
          ? [
              { label: "Projects", href: "/projects" },
              { label: project.Name, href: `/projects/${project.NewId}` },
              { label: "Edit" },
            ]
          : [{ label: "Projects", href: "/projects" }, { label: "Create Project" }]
      }
      eyebrow="Project routing"
      title={isEdit ? "Edit Project" : "Create Project"}
      toolbar={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{isEdit ? "Edit project" : "New project setup"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? "Update the owner, tags, timeline, repositories, and environment URLs of this project."
              : "Add a new project with its owner, tags, environment URLs, and go-live date."}
          </p>
        </div>
      }
    >
      <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  placeholder="Example: Analytics Console"
                  value={name}
                  aria-invalid={nameError || nameTaken || undefined}
                  onChange={(event) => setName(event.target.value)}
                />
                {nameError ? <p className="text-xs text-destructive">Project name is required.</p> : null}
                {nameTaken ? <p className="text-xs text-destructive">A project with this name already exists.</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-owner">Owner</Label>
                <SearchSelect
                  id="project-owner"
                  options={ownerOptions}
                  value={ownerId}
                  onValueChange={setOwnerId}
                  placeholder={users === null ? "Loading users..." : "Search a user by name or email"}
                  emptyText="No users found."
                  disabled={users === null}
                  invalid={ownerError}
                />
                {ownerError ? <p className="text-xs text-destructive">Choose an owner.</p> : null}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 md:items-start">
              <div className="grid gap-2">
                <Label>Tags</Label>
                <p className="text-xs text-muted-foreground">Pick the team domains this project belongs to.</p>
                {tagOptions === null ? (
                  <div className="flex flex-wrap gap-2" aria-hidden="true">
                    {[36, 44, 40].map((width) => (
                      <Skeleton key={width} className="h-8 rounded-full" style={{ width: width * 4 }} />
                    ))}
                  </div>
                ) : tagOptions.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.map((tag) => (
                      <label
                        key={tag.Id}
                        className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/10"
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={tags.includes(tag.Name)}
                          onChange={(event) => toggleTag(tag.Name, event.target.checked)}
                        />
                        {tag.Name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No team domains yet. Add them in Settings → Categories → Teams Domain.
                  </p>
                )}
              </div>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="project-go-live">Go Live date</Label>
                  <Input
                    id="project-go-live"
                    type="date"
                    className="[color-scheme:light] dark:[color-scheme:dark]"
                    min={DATE_MIN}
                    max={DATE_MAX}
                    value={goLiveDate}
                    onChange={(event) => setGoLiveDate(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="project-priority">Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority((value ?? DEFAULT_PRIORITY) as ProjectPriority)}>
                    <SelectTrigger id="project-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_PRIORITIES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Describe the project's goal, main scope, and how it relates to bug tracker routing."
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Enter planned dates for each phase, then add actual dates to compare delivery against the plan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              {phases.length ? (
                <div className="hidden gap-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(0,16rem)_minmax(0,12rem)_minmax(0,12rem)_2rem]">
                  <span>Phase</span>
                  <span>Plan dates</span>
                  <span>Actual dates</span>
                  <span />
                </div>
              ) : null}

              {phases.map((phase, index) => {
                const error = orderError(phase) ?? (submitted ? missingField(phase) : null);

                return (
                  <div key={phase.id} className="grid gap-1 rounded-lg border p-3 md:border-0 md:p-0">
                    <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,16rem)_minmax(0,12rem)_minmax(0,12rem)_2rem] md:items-center">
                      <Input
                        aria-label={`Phase ${index + 1} name`}
                        placeholder="Example: Development"
                        maxLength={100}
                        value={phase.name}
                        aria-invalid={(error && !phase.name.trim()) || undefined}
                        onChange={(event) => updatePhase(phase.id, { name: event.target.value })}
                      />
                      <div className="grid min-w-0 gap-1">
                        <span className="text-xs text-muted-foreground md:hidden">Plan dates</span>
                        <details className="group relative min-w-0">
                          <summary
                            aria-label={`Choose planned date range for phase ${index + 1}`}
                            aria-invalid={(error && (parseDateOnly(phase.start) === null || parseDateOnly(phase.end) === null || orderError(phase) !== null)) || undefined}
                            className="flex h-9 min-w-0 w-full cursor-pointer list-none items-center overflow-hidden rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none marker:hidden focus-visible:ring-3 focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive [&::-webkit-details-marker]:hidden"
                          >
                            <span className="truncate">{formatDateRange(phase.start, phase.end)}</span>
                          </summary>
                          <div className="absolute top-full left-0 z-30 mt-1 grid w-72 gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-lg">
                            <label className="grid gap-1 text-xs text-muted-foreground">
                              Plan start
                              <Input type="date" aria-label={`Phase ${index + 1} planned start date`} className="[color-scheme:light] dark:[color-scheme:dark]" min={DATE_MIN} max={DATE_MAX} value={phase.start} aria-invalid={(error && parseDateOnly(phase.start) === null) || undefined} onChange={(event) => updatePhase(phase.id, { start: event.target.value })} />
                            </label>
                            <label className="grid gap-1 text-xs text-muted-foreground">
                              Plan end
                              <Input type="date" aria-label={`Phase ${index + 1} planned end date`} className="[color-scheme:light] dark:[color-scheme:dark]" min={phase.start || DATE_MIN} max={DATE_MAX} value={phase.end} aria-invalid={(error && (parseDateOnly(phase.end) === null || orderError(phase) !== null)) || undefined} onChange={(event) => updatePhase(phase.id, { end: event.target.value })} />
                            </label>
                          </div>
                        </details>
                      </div>
                      <div className="grid min-w-0 gap-1">
                        <span className="text-xs text-muted-foreground md:hidden">Actual dates</span>
                        <details className="group relative min-w-0">
                          <summary
                            aria-label={`Choose actual date range for phase ${index + 1}`}
                            aria-invalid={submitted && (Boolean(phase.actualStart) !== Boolean(phase.actualEnd) || Boolean(phase.actualStart && phase.actualEnd && parseDateOnly(phase.actualEnd)! < parseDateOnly(phase.actualStart)!)) || undefined}
                            className="flex h-9 min-w-0 w-full cursor-pointer list-none items-center overflow-hidden rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none marker:hidden focus-visible:ring-3 focus-visible:ring-ring/50 aria-[invalid=true]:border-destructive [&::-webkit-details-marker]:hidden"
                          >
                            <span className="truncate">{formatDateRange(phase.actualStart, phase.actualEnd)}</span>
                          </summary>
                          <div className="absolute top-full right-0 left-auto z-30 mt-1 grid w-72 gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-lg">
                            <label className="grid gap-1 text-xs text-muted-foreground">
                              Actual start
                              <Input type="date" aria-label={`Phase ${index + 1} actual start date`} className="[color-scheme:light] dark:[color-scheme:dark]" min={DATE_MIN} max={DATE_MAX} value={phase.actualStart} aria-invalid={submitted && (Boolean(phase.actualStart) !== Boolean(phase.actualEnd)) || undefined} onChange={(event) => updatePhase(phase.id, { actualStart: event.target.value })} />
                            </label>
                            <label className="grid gap-1 text-xs text-muted-foreground">
                              Actual end
                              <Input type="date" aria-label={`Phase ${index + 1} actual end date`} className="[color-scheme:light] dark:[color-scheme:dark]" min={phase.actualStart || DATE_MIN} max={DATE_MAX} value={phase.actualEnd} aria-invalid={submitted && (Boolean(phase.actualStart) !== Boolean(phase.actualEnd) || Boolean(phase.actualStart && phase.actualEnd && parseDateOnly(phase.actualEnd)! < parseDateOnly(phase.actualStart)!)) || undefined} onChange={(event) => updatePhase(phase.id, { actualEnd: event.target.value })} />
                            </label>
                          </div>
                        </details>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove phase ${index + 1}`}
                        onClick={() => removePhase(phase.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {error ? <p className="text-xs text-destructive">{error}</p> : null}
                    {submitted && actualDatesInvalid ? <p className="text-xs text-destructive">Enter both actual dates and make sure the end is on or after the start.</p> : null}
                  </div>
                );
              })}

              <div>
                <Button type="button" variant="outline" onClick={addPhase}>
                  <Plus />
                  Add phase
                </Button>
              </div>
            </div>

            <ProjectGantt phases={validPhases} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
            <CardDescription>
              Source code repositories for this project. Add more if it spans several repositories.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {repositories.map((item, index) => {
              const duplicate = isDuplicateRepository(index);

              return (
                <div key={item.id} className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Repository ${index + 1}`}
                      className="font-mono"
                      placeholder="github.com/company/project-name"
                      value={item.value}
                      aria-invalid={duplicate || undefined}
                      onChange={(event) => updateRepository(item.id, event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove repository ${index + 1}`}
                      onClick={() => removeRepository(item.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {duplicate ? <p className="text-xs text-destructive">This repository is already added.</p> : null}
                </div>
              );
            })}
            <div>
              <Button type="button" variant="outline" onClick={addRepository}>
                <Plus />
                Add repository
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
            <CardDescription>Add the technologies used for the database, frontend, or backend.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {techStack.map((item, index) => (
              <div key={item.id} className="grid gap-2 sm:grid-cols-[10rem_10rem_10rem_2rem]">
                <select
                  aria-label={`Tech stack category ${index + 1}`}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={item.category}
                  onChange={(event) => updateTechStack(item.id, { category: event.target.value as TechStackCategory })}
                >
                  {TECH_STACK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                <Input
                  aria-label={`${item.category} technology ${index + 1}`}
                  placeholder={item.category === "Database" ? "Neon, PostgreSQL..." : item.category === "Frontend" ? "Next.js, React..." : "Node.js, .NET..."}
                  value={item.technology}
                  maxLength={100}
                  onChange={(event) => updateTechStack(item.id, { technology: event.target.value })}
                />
                <Input
                  aria-label={`${item.category} version ${index + 1}`}
                  placeholder="Version (required)"
                  value={item.version}
                  maxLength={50}
                  aria-invalid={submitted && !item.version.trim() || undefined}
                  onChange={(event) => updateTechStack(item.id, { version: event.target.value })}
                />
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${item.category} technology ${index + 1}`} onClick={() => removeTechStack(item.id)}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" onClick={addTechStack}>
                <Plus /> Add stack
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment URLs</CardTitle>
            <CardDescription>
              Where this project runs in each environment. Leave a URL empty if the project is not deployed there.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {environments === null
              ? [0, 1, 2].map((row) => (
                  <div key={row} className="grid gap-2 md:grid-cols-[10rem_1fr] md:items-center" aria-hidden="true">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))
              : environments.map((env) => {
                  const inputId = `project-url-${env.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

                  return (
                    <div key={env} className="grid gap-2 md:grid-cols-[10rem_1fr] md:items-start">
                      <Label htmlFor={inputId} className="md:pt-2">
                        {env}
                      </Label>
                      <div className="grid gap-1">
                        <Input
                          id={inputId}
                          inputMode="url"
                          className="font-mono"
                          placeholder={`https://${env.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example.com`}
                          value={urls[env] ?? ""}
                          aria-invalid={urlErrors[env] || undefined}
                          onChange={(event) => setUrls((current) => ({ ...current, [env]: event.target.value }))}
                        />
                        {urlErrors[env] ? (
                          <p className="text-xs text-destructive">Enter a valid URL starting with http:// or https://.</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button nativeButton={false} render={<Link href={isEdit ? `/projects/${project.NewId}` : "/projects"} />} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

type LoadState =
  | { status: "loading" }
  | { status: "notFound" }
  | { status: "error" }
  | { status: "ready"; project: ProjectDetail };

function EditProjectLoader({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

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

  // Form baru dibuat setelah data project ada, jadi isian awalnya langsung terisi.
  if (state.status === "ready") return <ProjectForm project={state.project} />;

  return (
    <AppShell
      activeNav="projects"
      breadcrumbs={[{ label: "Projects", href: "/projects" }, { label: "Edit Project" }]}
      eyebrow="Project routing"
      title="Edit Project"
    >
      {state.status === "loading" ? (
        <div className="space-y-6" aria-hidden="true">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
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
            <Button nativeButton={false} render={<Link href="/projects" />} variant="outline">
              <ArrowLeft /> Back to projects
            </Button>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

// Tanpa projectId: form membuat project baru. Dengan projectId: form mengedit project itu.
export function ProjectFormPage({ projectId }: { projectId?: string }) {
  return projectId ? <EditProjectLoader id={projectId} /> : <ProjectForm />;
}
