"use client";

import type { FormEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlignLeft, ArrowLeft, Clock3, FileCode2, FileImage, FileText, Film, FileUp, Gauge, MessageSquarePlus, Plus, RefreshCcw, Tag, Trash2, UserRound, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  getAssigneeName,
  getIssueById,
  getRelativeTime,
  picOptions,
  priorityVariant,
} from "@/features/bug-tracker/data/bug-tracker-data";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";

const issueStatusOptions = ["Backlog", "Ready", "Investigating", "In review", "Done"] as const;

type EvidenceItem = {
  name: string;
  type: string;
  size: string;
  note: string;
  icon: typeof FileImage;
};

type EvidenceUpload = {
  id: string;
  name: string;
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

function formatHistoryDate(dateString: string) {
  return formatDate(dateString);
}

const issueEvidence = {
  "BUG-218": [
    {
      name: "upload-crash-repro.mp4",
      type: "Video reproduction",
      size: "18.4 MB",
      note: "QA capture showing app crash after uploading a 12.6 MB PNG file.",
      icon: Film,
    },
    {
      name: "memory-usage-spike.png",
      type: "Screenshot",
      size: "2.1 MB",
      note: "Heap usage peaks right before preview generation fails.",
      icon: FileImage,
    },
    {
      name: "cloud-function-error.log",
      type: "Runtime log",
      size: "184 KB",
      note: "Stack trace from upload worker with memory limit warning.",
      icon: FileCode2,
    },
  ],
  "BUG-214": [
    {
      name: "offline-reconnect-flow.mp4",
      type: "Video reproduction",
      size: "9.8 MB",
      note: "Queued comment gets submitted twice after reconnect event fires.",
      icon: Film,
    },
    {
      name: "request-timeline.txt",
      type: "Request trace",
      size: "54 KB",
      note: "Shows duplicated replay payloads in websocket recovery path.",
      icon: FileText,
    },
  ],
  default: [
    {
      name: "bug-evidence.png",
      type: "Screenshot",
      size: "1.4 MB",
      note: "Captured UI state from the latest reported reproduction.",
      icon: FileImage,
    },
    {
      name: "console-output.log",
      type: "Runtime log",
      size: "92 KB",
      note: "Relevant console and app trace collected during triage.",
      icon: FileCode2,
    },
  ],
} as const;

export function IssueDetailPage({ id }: { id: string }) {
  const issue = getIssueById(id);
  const uploadId = useId();
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const baseEvidenceItems = issueEvidence[issue?.id as keyof typeof issueEvidence] ?? issueEvidence.default;
  const assigneeName = issue ? getAssigneeName(issue.assignee) : "";
  const [draftComment, setDraftComment] = useState("");
  const [comments, setComments] = useState(() => issue?.comments ?? []);
  const [currentStatus, setCurrentStatus] = useState(issue?.status ?? "Backlog");
  const [pendingStatus, setPendingStatus] = useState(issue?.status ?? "Backlog");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [uploadedEvidence, setUploadedEvidence] = useState<EvidenceUpload[]>([]);
  const evidenceItems: EvidenceItem[] = [
    ...baseEvidenceItems,
    ...uploadedEvidence.map((file) => ({
      name: file.name,
      type: "Uploaded evidence",
      size: file.sizeLabel,
      note:
        file.status === "done"
          ? "Dummy evidence tambahan yang baru di-upload dari halaman detail issue."
          : "File masih dalam proses upload. Preview akan lebih berguna setelah upload selesai.",
      icon: FileImage,
    })),
  ];
  const mentionMatch = draftComment.match(/(?:^|\s)@([\w.]*)$/);
  const mentionQuery = mentionMatch?.[1]?.toLowerCase() ?? "";
  const mentionOptions = useMemo(() => {
    if (!draftComment.includes("@")) {
      return [];
    }

    return picOptions.filter((person) =>
      mentionQuery
        ? person.label.toLowerCase().includes(mentionQuery)
        : true,
    );
  }, [mentionQuery, draftComment]);

  useEffect(() => {
    const hasUploadingFile = uploadedEvidence.some((file) => file.status === "uploading");

    if (!hasUploadingFile) {
      return;
    }

    const timer = window.setInterval(() => {
      setUploadedEvidence((current) =>
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
  }, [uploadedEvidence]);

  function handlePostComment() {
    if (!draftComment.trim()) {
      appToast.error({
        title: "Comment is empty",
        description: "Write a quick update or note before posting it to the discussion thread.",
      });
      return;
    }

    setComments((current) => [
      ...current,
      {
        id: `comment-${Date.now()}`,
        author: "You",
        text: draftComment.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraftComment("");
    appToast.success({
      title: "Comment posted",
      description: "Your update has been added to the issue discussion.",
    });
  }

  function handleDeleteComment(commentId: string) {
    setComments((current) => current.filter((comment) => comment.id !== commentId));
    appToast.success({
      title: "Comment deleted",
      description: "Your comment has been removed from the discussion.",
    });
  }

  function handleSelectMention(name: string) {
    setDraftComment((current) => current.replace(/@[\w.]*$/, `@${name} `));

    window.setTimeout(() => {
      commentInputRef.current?.focus();
      const length = commentInputRef.current?.value.length ?? 0;
      commentInputRef.current?.setSelectionRange(length, length);
    }, 0);
  }

  function handleDeleteUploadedEvidence(id: string) {
    setUploadedEvidence((current) => current.filter((file) => file.id !== id));
  }

  function handleChangeStatus() {
    if (pendingStatus === currentStatus) {
      appToast.error({
        title: "Status belum berubah",
        description: "Pilih status lain terlebih dahulu sebelum menyimpan perubahan.",
      });
      return;
    }

    setCurrentStatus(pendingStatus);
    setIsChangeStatusOpen(false);
    appToast.success({
      title: "Status berhasil diperbarui",
      description: `Issue dipindahkan ke status ${pendingStatus}.`,
    });
  }

  function handleAddEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasUploadingEvidence = uploadedEvidence.some((file) => file.status === "uploading");

    if (hasUploadingEvidence) {
      appToast.error({
        title: "Evidence masih di-upload",
        description: "Tunggu semua file evidence tambahan selesai di-upload terlebih dahulu.",
      });
      return;
    }

    if (!uploadedEvidence.some((file) => file.status === "done")) {
      appToast.error({
        title: "Belum ada evidence baru",
        description: "Upload minimal satu file evidence sebelum menyimpan perubahan.",
      });
      return;
    }

    setIsAddEvidenceOpen(false);
    appToast.success({
      title: "Evidence berhasil ditambahkan",
      description: "File evidence tambahan sudah masuk ke daftar issue ini.",
    });
  }

  function handlePendingStatusChange(value: (typeof issueStatusOptions)[number] | null) {
    if (!value) {
      return;
    }

    setPendingStatus(value);
  }

  function renderCommentWithMentions(text: string) {
    const mentionNames = picOptions
      .map((person) => person.label)
      .sort((first, second) => second.length - first.length);

    const segments: Array<{ text: string; isMention: boolean }> = [];
    let cursor = 0;

    while (cursor < text.length) {
      let matchedMention: string | null = null;

      for (const name of mentionNames) {
        const mentionToken = `@${name}`;
        if (text.slice(cursor, cursor + mentionToken.length) === mentionToken) {
          matchedMention = mentionToken;
          break;
        }
      }

      if (matchedMention) {
        segments.push({ text: matchedMention, isMention: true });
        cursor += matchedMention.length;
        continue;
      }

      let nextCursor = cursor + 1;
      while (nextCursor < text.length) {
        const hasUpcomingMention = mentionNames.some((name) =>
          text.slice(nextCursor, nextCursor + name.length + 1) === `@${name}`,
        );

        if (hasUpcomingMention) {
          break;
        }

        nextCursor += 1;
      }

      segments.push({ text: text.slice(cursor, nextCursor), isMention: false });
      cursor = nextCursor;
    }

    return segments.map((part, index) => {
      if (part.isMention) {
        return (
          <span key={`${part.text}-${index}`} className="font-medium text-primary">
            {part.text}
          </span>
        );
      }

      return <span key={`${part.text}-${index}`}>{part.text}</span>;
    });
  }

  if (!issue) {
    return (
      <AppShell
        activeNav="issues"
        breadcrumbs={[
          { label: "All Issues", href: "/issues" },
          { label: "Issue Not Found" },
        ]}
        eyebrow="Issue detail"
        title="Issue Not Found"
      >
        <Card>
          <CardHeader>
            <CardTitle>Issue not found</CardTitle>
            <CardDescription>Issue dengan id `{id}` belum ada di source data saat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/issues" />} variant="outline">
              Back to issues
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeNav="issues"
      breadcrumbs={[
        { label: "All Issues", href: "/issues" },
        { label: issue.id },
      ]}
      eyebrow="Issue detail"
      title={issue.id}
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Issue details</h2>
            <p className="text-sm text-muted-foreground">Detailed view of the issue, status, and related metadata.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button nativeButton={false} render={<Link href="/issues" />} variant="outline">
              <ArrowLeft />
              Back to issues
            </Button>
            <Button onClick={() => setIsChangeStatusOpen(true)}>
              <RefreshCcw />
              Change status
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">{issue.id}</span>
                    <Badge variant={priorityVariant(issue.priority)}>{issue.priority}</Badge>
                  </div>
                  <CardTitle className="max-w-4xl text-2xl leading-tight lg:text-3xl">{issue.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">Opened {getRelativeTime(issue.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end" />
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <UserRound className="size-4" />
                    Assignee
                  </p>
                  <p className="font-medium">{assigneeName}</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Users className="size-4" />
                    Team
                  </p>
                  <p className="font-medium">{issue.team}</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Tag className="size-4" />
                    Label
                  </p>
                  <p className="font-medium">{issue.label}</p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Gauge className="size-4" />
                    Status
                  </p>
                  <p className="font-medium">{currentStatus}</p>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <AlignLeft className="size-4" />
                  Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground/90">
                  {issue.summary || "No summary provided."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
              <CardDescription>Share updates, ask questions, or provide feedback on this issue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    <Avatar className="size-9">
                      <AvatarImage src={comment.avatar} />
                      <AvatarFallback>
                        {comment.author
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{comment.author}</p>
                          <span className="text-xs text-muted-foreground">{getRelativeTime(comment.createdAt)}</span>
                        </div>
                        {comment.author === "You" ? (
                          <Button
                            onClick={() => handleDeleteComment(comment.id)}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                      <div className="rounded-xl bg-muted/30 p-4 text-sm leading-relaxed">
                        {renderCommentWithMentions(comment.text)}
                      </div>
                    </div>
                  </div>
                ))}

                {comments.length === 0 && (
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    No discussion yet. Be the first to comment.
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-2">
                <Avatar className="size-9">
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div className="relative">
                    <Textarea
                      ref={commentInputRef}
                      className="min-h-15 resize-none"
                      onChange={(event) => setDraftComment(event.target.value)}
                      placeholder="Add a comment... gunakan @ untuk mention orang"
                      value={draftComment}
                    />
                    {mentionMatch && mentionOptions.length ? (
                      <div className="absolute top-12 left-3 z-10 w-[min(22rem,calc(100%-1.5rem))] rounded-xl border bg-background p-2 shadow-lg">
                        <p className="px-2 pb-1 text-xs text-muted-foreground">Mention someone</p>
                        <div className="space-y-1">
                          {mentionOptions.map((person) => (
                            <button
                              key={person.value}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                              onClick={() => handleSelectMention(person.label)}
                              type="button"
                            >
                              <span className="font-medium">{person.label}</span>
                              <span className="text-xs text-muted-foreground">{person.team}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handlePostComment}>
                      <MessageSquarePlus />
                      Post comment
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle>Evidence</CardTitle>
                <CardDescription>Attached files and captures related to this bug report.</CardDescription>
              </div>
              <Button onClick={() => setIsAddEvidenceOpen(true)} size="sm" variant="outline">
                <Plus />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidenceItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    className="w-full rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/30"
                    onClick={() => setSelectedEvidence(item)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.type}</p>
                          </div>
                          <Badge variant="outline">{item.size}</Badge>
                        </div>
                        {/* <p className="text-sm leading-relaxed text-muted-foreground">{item.note}</p> */}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Button className="w-full justify-center" onClick={() => setIsHistoryOpen(true)} variant="outline">
            <Clock3 />
            View history
          </Button>
        </div>
      </div>
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Issue history</SheetTitle>
            <SheetDescription>Activity log for {issue.id}.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            <div className="relative border-l pb-4 pl-4 last:pb-0">
              <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border bg-background" />
              <p className="text-sm font-medium">Issue created</p>
              <p className="text-xs text-muted-foreground">by Reporter</p>
              <p className="text-xs text-muted-foreground">{formatHistoryDate(issue.createdAt)}</p>
            </div>
            <div className="relative border-l pb-4 pl-4 last:pb-0">
              <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border bg-background" />
              <p className="text-sm font-medium">Assigned to {assigneeName}</p>
              <p className="text-xs text-muted-foreground">by System</p>
              <p className="text-xs text-muted-foreground">{formatHistoryDate(issue.createdAt)}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={isChangeStatusOpen} onOpenChange={setIsChangeStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>Pilih status baru untuk issue {issue.id}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Issue status</p>
            <Select onValueChange={handlePendingStatusChange} value={pendingStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih status issue" />
              </SelectTrigger>
              <SelectContent>
                {issueStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsChangeStatusOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleChangeStatus}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedEvidence)} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEvidence?.name ?? "Evidence preview"}</DialogTitle>
            <DialogDescription>
              Dummy preview untuk evidence issue. Nanti bisa diganti ke viewer file asli.
            </DialogDescription>
          </DialogHeader>
          {selectedEvidence ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{selectedEvidence.type}</p>
                </div>
                <Badge variant="outline">{selectedEvidence.size}</Badge>
              </div>
              <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 text-center">
                <div className="space-y-3">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
                    <selectedEvidence.icon className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{selectedEvidence.name}</p>
                    <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                      {selectedEvidence.note}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={isAddEvidenceOpen} onOpenChange={setIsAddEvidenceOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add evidence</DialogTitle>
            <DialogDescription>
              Upload evidence tambahan untuk issue {issue.id}. Konsep upload ini dibuat sama seperti halaman create issue.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleAddEvidence}>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Upload evidence</p>
                <span className="text-xs text-muted-foreground">PNG, JPG, PDF, atau video pendek</span>
              </div>
              <label
                htmlFor={uploadId}
                className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-5 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileUp className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">Klik untuk upload evidence tambahan</p>
                  <p className="text-sm text-muted-foreground">
                    Bisa upload screenshot, screen recording, log export, atau PDF pendukung.
                  </p>
                </div>
              </label>
              <input
                id={uploadId}
                multiple
                type="file"
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) {
                    return;
                  }

                  setUploadedEvidence((current) => [
                    ...current,
                    ...files.map((file, index) => ({
                      id: `${file.name}-${file.size}-${Date.now()}-${index}`,
                      name: file.name,
                      sizeLabel: formatFileSize(file.size),
                      progress: 0,
                      status: "uploading" as const,
                    })),
                  ]);
                  event.target.value = "";
                }}
              />
            </div>

            {uploadedEvidence.length ? (
              <div className="space-y-3">
                {uploadedEvidence.map((file) => (
                  <div key={file.id} className="rounded-xl border bg-card p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.sizeLabel}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{file.progress}%</span>
                        <Badge variant={file.status === "done" ? "secondary" : "outline"}>
                          {file.status === "done" ? "Uploaded" : "Uploading"}
                        </Badge>
                        {file.status === "done" ? (
                          <Button
                            onClick={() => handleDeleteUploadedEvidence(file.id)}
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
              <p className="text-sm text-muted-foreground">Belum ada file tambahan yang dipilih.</p>
            )}

            <DialogFooter>
              <Button onClick={() => setIsAddEvidenceOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit">Save evidence</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
