"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, GripVertical, ListFilter, MessageSquare, Plus, Search, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  issues as initialIssues,
  kanbanColumns,
  priorityVariant,
  type IssueRecord,
  type IssueStatus,
} from "@/features/bug-tracker/data/bug-tracker-data";

const STORAGE_KEY = "bug-tracker:kanban-issues";
const CURRENT_AUTHOR = "You";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

type DragState = {
  issueId: string | null;
  overColumn: IssueStatus | null;
};

function KanbanToolbar() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Kanban flow and triage</h2>
        <p className="text-sm text-muted-foreground">
          Pantau alur issue aktif dan pindahkan status bug langsung dari board.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto lg:justify-end">
        <div className="flex w-full min-w-0 sm:min-w-72 items-center gap-2 rounded-xl border bg-card px-3 sm:w-auto">
          <Search className="size-4 text-muted-foreground" />
          <Input
            aria-label="Search board"
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="Search cards, assignees, teams, or bug ids..."
          />
        </div>
        <Select defaultValue="critical-high">
          <SelectTrigger>
            <ListFilter />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="critical-high">Critical + High</SelectItem>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="frontend">Frontend only</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="sprint-12">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sprint-12">Sprint 12</SelectItem>
            <SelectItem value="hotfix">Hotfix lane</SelectItem>
            <SelectItem value="backlog">Backlog review</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  issue: IssueRecord;
  dragging: boolean;
  onDragStart: (issueId: string) => void;
  onDragEnd: () => void;
  onOpen: (issueId: string) => void;
}) {
  const checklist = issue.checklist ?? [];
  const doneCount = checklist.filter((item) => item.done).length;
  const commentCount = issue.comments?.length ?? 0;

  return (
    <Card
      draggable
      onClick={() => onOpen(issue.id)}
      onDragStart={() => onDragStart(issue.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab border-border/80 bg-card/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
        dragging && "opacity-55 ring-2 ring-primary/30"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{issue.id}</CardTitle>
            <CardDescription className="mt-1 leading-6 text-foreground/90">
              {issue.title}
            </CardDescription>
          </div>
          <GripVertical className="mt-0.5 size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={priorityVariant(issue.priority)}>{issue.priority}</Badge>
          <Badge variant="outline">{issue.team}</Badge>
        </div>
        {issue.summary ? (
          <p className="text-sm leading-6 text-muted-foreground">{issue.summary}</p>
        ) : null}
        {checklist.length || commentCount ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {checklist.length ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  doneCount === checklist.length && "text-emerald-600 dark:text-emerald-400"
                )}
              >
                <CheckSquare className="size-3.5" />
                {doneCount}/{checklist.length}
              </span>
            ) : null}
            {commentCount ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3.5" />
                {commentCount}
              </span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function KanbanColumnView({
  id,
  title,
  description,
  issues,
  isOver,
  draggingId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onOpen,
  onAddCard,
}: {
  id: IssueStatus;
  title: string;
  description: string;
  issues: IssueRecord[];
  isOver: boolean;
  draggingId: string | null;
  onDragStart: (issueId: string) => void;
  onDragEnd: () => void;
  onDragOver: (column: IssueStatus) => void;
  onDrop: (column: IssueStatus) => void;
  onOpen: (issueId: string) => void;
  onAddCard: (column: IssueStatus, title: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  function submitCard() {
    const title = draftTitle.trim();
    if (!title) return;

    onAddCard(id, title);
    setDraftTitle("");
  }

  return (
    <Card
      className={cn(
        "relative flex h-full min-h-[32rem] flex-col border border-border/80 bg-muted/20 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/80 before:content-['']",
        isOver && "border-primary bg-primary/5 before:bg-primary shadow-sm"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(id);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(id);
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{issues.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 rounded-lg flex-col gap-3 p-3">
        {issues.length ? (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              dragging={draggingId === issue.id}
              issue={issue}
              onDragEnd={onDragEnd}
              onDragStart={onDragStart}
              onOpen={onOpen}
            />
          ))
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed bg-background/70 px-4 text-center text-sm text-muted-foreground">
            Drop bug cards here.
          </div>
        )}

        {isAdding ? (
          <div className="space-y-2">
            <Input
              autoFocus
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitCard();
                if (event.key === "Escape") setIsAdding(false);
              }}
              placeholder="Judul card..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={submitCard}>
                Add card
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setIsAdding(false)}>
                <X />
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => setIsAdding(true)}>
            <Plus />
            Add a card
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function IssueDetailDialog({
  issue,
  onClose,
  onChange,
}: {
  issue: IssueRecord | null;
  onClose: () => void;
  onChange: (issueId: string, patch: Partial<IssueRecord>) => void;
}) {
  const [taskText, setTaskText] = useState("");
  const [commentText, setCommentText] = useState("");
  const checklist = issue?.checklist ?? [];
  const comments = issue?.comments ?? [];
  const doneCount = checklist.filter((item) => item.done).length;
  const progress = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;

  function addTask() {
    const text = taskText.trim();
    if (!issue || !text) return;

    onChange(issue.id, { checklist: [...checklist, { id: newId("task"), text, done: false }] });
    setTaskText("");
  }

  function addComment() {
    const text = commentText.trim();
    if (!issue || !text) return;

    onChange(issue.id, {
      comments: [
        ...comments,
        { id: newId("comment"), author: CURRENT_AUTHOR, text, createdAt: new Date().toISOString() },
      ],
    });
    setCommentText("");
  }

  return (
    <Dialog open={issue !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {issue ? (
          <>
            <DialogHeader>
              <DialogDescription>{issue.id}</DialogDescription>
              <DialogTitle>
                <Input
                  aria-label="Card title"
                  className="h-9 text-base font-semibold"
                  value={issue.title}
                  onChange={(event) => onChange(issue.id, { title: event.target.value })}
                />
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={issue.status} onValueChange={(value) => value && onChange(issue.id, { status: value as IssueStatus })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kanbanColumns.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={priorityVariant(issue.priority)}>{issue.priority}</Badge>
              <Badge variant="outline">{issue.team}</Badge>
            </div>

            <div className="grid gap-2">
              <label htmlFor="card-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="card-description"
                value={issue.summary ?? ""}
                onChange={(event) => onChange(issue.id, { summary: event.target.value })}
                placeholder="Tambahkan deskripsi..."
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Checklist</p>
                {checklist.length ? (
                  <span className="text-xs text-muted-foreground">
                    {doneCount}/{checklist.length} · {progress}%
                  </span>
                ) : null}
              </div>
              {checklist.length ? (
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              ) : null}
              <ul className="grid gap-1">
                {checklist.map((item) => (
                  <li key={item.id} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={item.done}
                      onChange={(event) =>
                        onChange(issue.id, {
                          checklist: checklist.map((task) =>
                            task.id === item.id ? { ...task, done: event.target.checked } : task
                          ),
                        })
                      }
                    />
                    <span className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${item.text}`}
                      onClick={() => onChange(issue.id, { checklist: checklist.filter((task) => task.id !== item.id) })}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={taskText}
                  onChange={(event) => setTaskText(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addTask()}
                  placeholder="Tambah task..."
                />
                <Button variant="outline" onClick={addTask}>
                  <Plus />
                  Add
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-medium">Comments</p>
              <div className="flex gap-2">
                <Input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addComment()}
                  placeholder="Tulis comment..."
                />
                <Button onClick={addComment}>Send</Button>
              </div>
              <ul className="grid gap-2">
                {[...comments].reverse().map((comment) => (
                  <li key={comment.id} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{comment.author}</span>
                      <span>{new Date(comment.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6">{comment.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function KanbanBoard() {
  const [issues, setIssues] = useState<IssueRecord[]>(initialIssues);
  const [dragState, setDragState] = useState<DragState>({
    issueId: null,
    overColumn: null,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setIssues(JSON.parse(raw) as IssueRecord[]);
    } catch {
      // ignore unreadable storage and keep seed data
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch {
      // storage unavailable; changes stay in memory only
    }
  }, [hydrated, issues]);

  const groupedIssues = useMemo(
    () =>
      kanbanColumns.map((column) => ({
        ...column,
        issues: issues.filter((issue) => issue.status === column.id),
      })).filter((column) => column.id !== "Backlog"),
    [issues]
  );

  function moveIssue(issueId: string, nextStatus: IssueStatus) {
    setIssues((current) =>
      current.map((issue) =>
        issue.id === issueId ? { ...issue, status: nextStatus } : issue
      )
    );
  }

  function updateIssue(issueId: string, patch: Partial<IssueRecord>) {
    setIssues((current) => current.map((issue) => (issue.id === issueId ? { ...issue, ...patch } : issue)));
  }

  function addCard(status: IssueStatus, title: string) {
    setIssues((current) => [
      ...current,
      {
        id: `KB-${Date.now().toString(36).toUpperCase()}`,
        title,
        priority: "Medium",
        status,
        team: "General",
        assignee: "Unassigned",
        label: "None",
        createdAt: new Date().toISOString().slice(0, 10),
        checklist: [],
        comments: [],
      },
    ]);
  }

  return (
    <AppShell
      activeNav="kanban"
      eyebrow="Sprint workflow"
      title="Bug Triage Kanban"
      toolbar={<KanbanToolbar />}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-1">
              <CardTitle>Kanban Board</CardTitle>
              <CardDescription>
                Drag and drop ringkasan alur triage, perpindahan status issue, dan distribusi beban kerja aktif dalam satu board.
              </CardDescription>
            </div>

            <Dialog>
              <DialogTrigger
                render={
                  <Button className="shrink-0" variant="outline">
                    View board rules
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Kanban board rules</DialogTitle>
                  <DialogDescription>
                    Semua aturan utama buat triage flow, status movement, dan kondisi board saat ini.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="font-medium">Triage SLA</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Critical issues should leave backlog within 2 hours. High priority issues should reach investigation on the same business day.
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="font-medium">Workflow hint</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Keep cards in ready only when reproduction steps, owner, and fix scope are clear enough for engineering pickup.
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="font-medium">Current board health</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>2 critical in review</Badge>
                      <Badge variant="secondary">3 waiting for QA</Badge>
                      <Badge variant="outline">1 rollback verified</Badge>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid min-w-[58rem] gap-4 xl:grid-cols-4">
            {groupedIssues.map((column) => (
              <KanbanColumnView
                key={column.id}
                description={column.description}
                draggingId={dragState.issueId}
                id={column.id}
                isOver={dragState.overColumn === column.id}
                issues={column.issues}
                onDragEnd={() => setDragState({ issueId: null, overColumn: null })}
                onDragOver={(nextColumn) =>
                  setDragState((current) => ({ ...current, overColumn: nextColumn }))
                }
                onDragStart={(issueId) => setDragState({ issueId, overColumn: null })}
                onDrop={(nextColumn) => {
                  if (dragState.issueId) moveIssue(dragState.issueId, nextColumn);
                  setDragState({ issueId: null, overColumn: null });
                }}
                onOpen={setSelectedId}
                onAddCard={addCard}
                title={column.title}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <IssueDetailDialog
        issue={issues.find((issue) => issue.id === selectedId) ?? null}
        onClose={() => setSelectedId(null)}
        onChange={updateIssue}
      />
    </AppShell>
  );
}
