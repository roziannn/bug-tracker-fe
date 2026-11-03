"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { CircleHelp, FileUp, Save, SendHorizonal, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { GuidedTour, type TourStep } from "@/components/shared/guided-tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  criticalityTiers,
} from "@/features/bug-tracker/data/bug-tracker-data";
import { appToast } from "@/lib/app-toast";
import { requestJson } from "@/lib/request";
import type { Category, Paged, Project, User } from "@/types";

// Tour dijalankan otomatis saat halaman pertama kali dibuka, dan bisa diulang lewat tombol "Take a tour".
const TOUR_SEEN_KEY = "bug-tracker:create-issue-tour-seen";

const tourSteps: TourStep[] = [
  { target: "title", title: "Title", content: "Write a specific title that engineers can easily search for." },
  {
    target: "evidence",
    title: "Upload evidence",
    content: "Attach screenshots, screen recordings, log exports, or PDFs. Evidence helps QA and developers reproduce the bug faster.",
  },
  {
    target: "description",
    title: "Description",
    content: "Describe the steps to reproduce, the expected and actual result, the environment, and the impact on users.",
  },
  {
    target: "classification",
    title: "Issue classification",
    content: "Choose the kind of problem, such as UI Bug, Functional, Performance, or Security.",
  },
  {
    target: "criticality",
    title: "Criticality tier",
    content: "Use Tier 1 for bugs that block a release, transactions, authentication, or core user data.",
  },
  { target: "pic", title: "PIC", content: "Pick the person in charge who will pick this issue up." },
  {
    target: "project",
    title: "Project",
    content: "Choose the project this issue belongs to, so it lands in the right triage queue.",
  },
  {
    target: "actions",
    title: "Save or submit",
    content: "Save a draft to continue later, or submit once all required fields are filled and the evidence has finished uploading.",
  },
];

type EvidenceUpload = {
  id: string;
  name: string;
  size: number;
  sizeLabel: string;
  progress: number;
  status: "uploading" | "done";
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

export function CreateIssuePage({ issueId: editIssueId }: { issueId?: string } = {}) {
  const uploadId = useId();
  const formId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [classifications, setClassifications] = useState<Category[]>([]);
  const [picId, setPicId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [classificationId, setClassificationId] = useState<string | null>(null);
  const [criticality, setCriticality] = useState("Tier 2 - Major");
  const [issueId, setIssueId] = useState<string | null>(editIssueId ?? null);
  const [savedStatus, setSavedStatus] = useState<"Draft" | "Backlog" | "Ready" | "Investigating" | "In review" | "Done">("Draft");
  const [loadingIssue, setLoadingIssue] = useState(Boolean(editIssueId));
  const [savingIssue, setSavingIssue] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceUpload[]>([]);
  // run dinaikkan tiap tour dimulai ulang, supaya selalu mulai dari langkah pertama.
  const [tour, setTour] = useState({ open: false, run: 0 });
  useEffect(() => {
    requestJson<Paged<User>>("/api/users?pageSize=100").then((result) => setUsers(result.data.filter((user) => user.IsActive))).catch((err) => appToast.error({ title: "Failed to load users", description: err instanceof Error ? err.message : undefined }));
    requestJson<Project[]>("/api/projects").then((result) => setProjects(result.filter((project) => project.IsActive))).catch((err) => appToast.error({ title: "Failed to load projects", description: err instanceof Error ? err.message : undefined }));
    requestJson<Category[]>("/api/categories?category=issue-classification").then((result) => setClassifications(result.filter((category) => category.IsActive))).catch((err) => appToast.error({ title: "Failed to load issue classifications", description: err instanceof Error ? err.message : undefined }));
  }, []);
  useEffect(() => {
    if (!editIssueId) return;
    requestJson<{
      title: string; description: string; classificationId: number | null; criticality: string;
      picId: number | null; projectId: string | null; status: string; evidence: { name: string; size: number }[];
    }>(`/api/issues/${encodeURIComponent(editIssueId)}`)
      .then((issue) => {
        setTitle(issue.title);
        setDescription(issue.description);
        setClassificationId(issue.classificationId === null ? null : String(issue.classificationId));
        setCriticality(issue.criticality);
        setPicId(issue.picId === null ? null : String(issue.picId));
        setProjectId(issue.projectId);
        setSavedStatus(["Draft", "Backlog", "Ready", "Investigating", "In review", "Done"].includes(issue.status) ? issue.status as typeof savedStatus : "Backlog");
        setSelectedEvidence(issue.evidence.map((file, index) => ({ id: `${file.name}-${index}`, name: file.name, size: file.size, sizeLabel: formatFileSize(file.size), progress: 100, status: "done" as const })));
      })
      .catch((err) => appToast.error({ title: "Failed to load issue for editing", description: err instanceof Error ? err.message : undefined }))
      .finally(() => setLoadingIssue(false));
  }, [editIssueId]);
  const classificationOptions = classifications.map((item) => ({ value: String(item.Id), label: item.Name, description: item.Description || undefined }));
  const userOptions = users.map((user) => ({ value: String(user.Id), label: user.Name, description: user.Email }));
  const projectOptions = projects.map((project) => ({ value: project.NewId, label: project.Name, description: project.Description || undefined }));
  const hasUploadingEvidence = selectedEvidence.some((file) => file.status === "uploading");
  const hasCompletedEvidence = selectedEvidence.some((file) => file.status === "done");
  const missingRequiredFields = [
    !title.trim() ? "title" : null,
    !description.trim() ? "description" : null,
    !hasCompletedEvidence ? "evidence" : null,
    !classificationId ? "classification" : null,
    !picId ? "PIC" : null,
    !projectId ? "project" : null,
  ].filter((field): field is string => Boolean(field));
  const isFormComplete = missingRequiredFields.length === 0;

  useEffect(() => {
    const hasUploadingFile = selectedEvidence.some((file) => file.status === "uploading");

    if (!hasUploadingFile) {
      return;
    }

    const timer = window.setInterval(() => {
      setSelectedEvidence((current) =>
        current.map((file) => {
          if (file.status === "done") {
            return file;
          }

          const nextProgress = Math.min(
            100,
            file.progress + Math.max(6, Math.round((100 - file.progress) * 0.18)),
          );

          return {
            ...file,
            progress: nextProgress,
            status: nextProgress >= 100 ? "done" : "uploading",
          };
        }),
      );
    }, 220);

    return () => window.clearInterval(timer);
  }, [selectedEvidence]);

  function handleDeleteEvidence(id: string) {
    setSelectedEvidence((current) => current.filter((file) => file.id !== id));
  }

  // Buka tour otomatis hanya kali pertama halaman ini dibuka. Kalau storage tidak tersedia, tidak dibuka otomatis.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (!window.localStorage.getItem(TOUR_SEEN_KEY)) setTour({ open: true, run: 1 });
      } catch {
        // storage unavailable
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  function startTour() {
    setTour((current) => ({ open: true, run: current.run + 1 }));
  }

  function closeTour() {
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      // storage unavailable
    }
    setTour((current) => ({ ...current, open: false }));
  }

  function issuePayload(status: typeof savedStatus) {
    return {
      issueId: issueId ?? undefined,
      title,
      description,
      classificationId: classificationId ? Number(classificationId) : null,
      criticality,
      picId: picId ? Number(picId) : null,
      projectId,
      evidence: selectedEvidence.filter((file) => file.status === "done").map((file) => ({ name: file.name, size: file.size })),
      status,
    };
  }

  async function saveDraft() {
    if (savingIssue || hasUploadingEvidence) return;
    setSavingIssue(true);
    try {
      const result = await requestJson<{ NewId: string; Status: string }>("/api/issues", "POST", issuePayload(editIssueId ? savedStatus : "Draft"));
      setIssueId(result.NewId);
      appToast.success({ title: editIssueId ? "Issue updated" : "Draft tersimpan", description: editIssueId ? "Issue changes have been saved." : "Draft issue berhasil disimpan." });
    } catch (err) {
      appToast.error({ title: "Gagal menyimpan draft", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingIssue(false);
    }
  }

  async function handleSubmitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasUploadingEvidence) {
      appToast.error({
        title: "Evidence masih di-upload",
        description: "Tunggu semua file evidence mencapai 100% sebelum submit issue.",
      });
      return;
    }

    if (!isFormComplete) {
      appToast.error({
        title: "Form belum lengkap",
        description: `Lengkapi field wajib terlebih dahulu: ${missingRequiredFields.join(", ")}.`,
      });
      return;
    }

    setSavingIssue(true);
    try {
      const result = await requestJson<{ NewId: string; Status: string }>("/api/issues", "POST", issuePayload("Backlog"));
      setIssueId(null);
      appToast.success({ title: "Issue berhasil disubmit", description: `Issue ID: ${result.NewId}` });
    } catch (err) {
      appToast.error({ title: "Gagal submit issue", description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingIssue(false);
    }
  }

  return (
    <AppShell
      activeNav="issues"
      breadcrumbs={[
        { label: "All Issues", href: "/issues" },
      { label: editIssueId ? "Edit Issue" : "Create Issue" },
      ]}
      eyebrow="Issue intake"
      title={editIssueId ? "Edit Issue" : "Create Issue"}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{editIssueId ? "Edit issue" : "New issue form"}</h2>
            <p className="text-sm text-muted-foreground">
              Lengkapi detail bug report supaya triage, assignment, dan follow-up bisa jalan lebih cepat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="destructive">Tier-aware intake</Badge>
            <Badge variant="outline">Attachment ready</Badge>
            <Badge variant="secondary">Project routing</Badge>
            <Button type="button" variant="outline" size="sm" onClick={startTour}>
              <CircleHelp />
              Take a tour
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Issue details</CardTitle>
            <CardDescription>
              Isi field utama untuk mendokumentasikan bug yang akan masuk ke backlog atau triage queue.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form id={formId} className="grid gap-6" onSubmit={handleSubmitIssue}>
              <div className="grid gap-2" data-tour="title">
                <Label htmlFor="issue-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="issue-title"
                  placeholder="Contoh: Attachment upload gagal saat file evidence lebih dari 10 MB"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="grid gap-2" data-tour="evidence">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={uploadId}>
                    Upload evidence <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPG, PDF, atau video pendek
                  </span>
                </div>

                <label
                  htmlFor={uploadId}
                  className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-5 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <FileUp className="size-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-medium">Klik untuk upload evidence</p>
                    <p className="text-sm text-muted-foreground">
                      Bisa upload screenshot, screen recording, log export, atau PDF pendukung.
                    </p>
                  </div>
                </label>
                <Input
                  id={uploadId}
                  multiple
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (!files.length) {
                      return;
                    }

                    setSelectedEvidence((current) => [
                      ...current,
                      ...files.map((file, index) => ({
                        id: `${file.name}-${file.size}-${Date.now()}-${index}`,
                        name: file.name,
                        size: file.size,
                        sizeLabel: formatFileSize(file.size),
                        progress: 0,
                        status: "uploading" as const,
                      })),
                    ]);
                    event.target.value = "";
                  }}
                />

                {selectedEvidence.length ? (
                  <div className="space-y-3">
                    {selectedEvidence.map((file) => (
                      <div key={file.id} className="rounded-xl border bg-card p-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{file.sizeLabel}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {file.progress}%
                            </span>
                            <Badge variant={file.status === "done" ? "secondary" : "outline"}>
                              {file.status === "done" ? "Uploaded" : "Uploading"}
                            </Badge>
                            {file.status === "done" ? (
                              <Button
                                onClick={() => handleDeleteEvidence(file.id)}
                                size="icon-sm"
                                type="button"
                                variant="outline"
                              >
                                <Trash2 />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-200"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Belum ada file yang dipilih.</p>
                )}
              </div>

              <div className="grid gap-2" data-tour="description">
                <Label htmlFor="issue-description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="issue-description"
                  placeholder="Jelaskan langkah reproduksi, hasil yang diharapkan, hasil aktual, environment, dan dampak ke user."
                  rows={8}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-3 border-t">
            <Button
              nativeButton={false}
              render={
                <Link href="/issues">
                  <X />
                  Cancel
                </Link>
              }
              variant="outline"
            />
            {hasUploadingEvidence ? (
              <p className="text-sm text-muted-foreground">
                Submit akan aktif setelah semua evidence selesai upload.
              </p>
            ) : null}
            <div className="flex items-center gap-2" data-tour="actions">
              <Button variant="outline" type="button" onClick={saveDraft} disabled={loadingIssue || savingIssue || hasUploadingEvidence}>
                <Save />
                {loadingIssue ? "Loading..." : savingIssue ? "Saving..." : editIssueId ? "Save changes" : "Save draft"}
              </Button>
              <Button disabled={loadingIssue || hasUploadingEvidence || !isFormComplete || savingIssue} form={formId} type="submit">
                <SendHorizonal />
                {savingIssue ? "Submitting..." : "Submit issue"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Classification &amp; routing</CardTitle>
              <CardDescription>Set how serious the issue is and who picks it up.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2" data-tour="classification">
                <Label htmlFor="issue-classification">
                  Issue classification <span className="text-destructive">*</span>
                </Label>
                <SearchSelect id="issue-classification" options={classificationOptions} value={classificationId} onValueChange={setClassificationId} placeholder="Pilih klasifikasi issue" emptyText="Belum ada klasifikasi." disabled={!classifications.length} />
              </div>

              <div className="grid gap-2" data-tour="criticality">
                <Label htmlFor="issue-criticality">
                  Criticality tier <span className="text-destructive">*</span>
                </Label>
                <Select value={criticality} onValueChange={(value) => value && setCriticality(value)}>
                  <SelectTrigger id="issue-criticality" className="w-full">
                    <SelectValue placeholder="Pilih criticality tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {criticalityTiers.map((tier) => (
                      <SelectItem key={tier} value={tier}>
                        {tier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2" data-tour="pic">
                <Label htmlFor="issue-pic">
                  PIC <span className="text-destructive">*</span>
                </Label>
                <SearchSelect id="issue-pic" options={userOptions} value={picId} onValueChange={setPicId} placeholder="Cari user berdasarkan nama atau email" emptyText="Tidak ada user ditemukan." disabled={!users.length} />
              </div>

              <div className="grid gap-2" data-tour="project">
                <Label htmlFor="issue-project">
                  Project <span className="text-destructive">*</span>
                </Label>
                <SearchSelect id="issue-project" options={projectOptions} value={projectId} onValueChange={setProjectId} placeholder="Cari project" emptyText="Tidak ada project ditemukan." disabled={!projects.length} />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {tour.open ? <GuidedTour key={tour.run} steps={tourSteps} onClose={closeTour} /> : null}
    </AppShell>
  );
}
