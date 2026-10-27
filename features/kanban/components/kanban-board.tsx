"use client";

import { useEffect, useMemo, useState } from "react";
import { AlignLeft, CheckSquare, Clock, GripVertical, ListFilter, MessageSquare, Pencil, Plus, Search, Tag, Trash2, UserPlus, X } from "lucide-react";

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
  const items = (issue.checklists ?? []).flatMap((list) => list.items);
  const doneCount = items.filter((item) => item.done).length;
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
        {items.length || commentCount ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {items.length ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  doneCount === items.length && "text-emerald-600 dark:text-emerald-400"
                )}
              >
                <CheckSquare className="size-3.5" />
                {doneCount}/{items.length}
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type DetailPanel = "labels" | "dates" | "members" | null;

function IssueDetailDialog({
  issue,
  onClose,
  onChange,
  onDelete,
}: {
  issue: IssueRecord | null;
  onClose: () => void;
  onChange: (issueId: string, patch: Partial<IssueRecord>) => void;
  onDelete: (issueId: string) => void;
}) {
  const [panel, setPanel] = useState<DetailPanel>(null);
  const [hideChecked, setHideChecked] = useState<Record<string, boolean>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentText, setCommentText] = useState("");
  const checklists = issue?.checklists ?? [];
  const comments = issue?.comments ?? [];

  function setChecklists(next: NonNullable<IssueRecord["checklists"]>) {
    if (issue) onChange(issue.id, { checklists: next });
  }

  function patchChecklist(listId: string, patch: Partial<NonNullable<IssueRecord["checklists"]>[number]>) {
    setChecklists(checklists.map((list) => (list.id === listId ? { ...list, ...patch } : list)));
  }

  function addChecklist() {
    const list = { id: newId("list"), title: "Checklist", items: [] };
    setChecklists([...checklists, list]);
    setAddingItemTo(list.id);
  }

  function addItem(listId: string) {
    const text = (itemDrafts[listId] ?? "").trim();
    const list = checklists.find((item) => item.id === listId);
    if (!text || !list) return;

    patchChecklist(listId, { items: [...list.items, { id: newId("task"), text, done: false }] });
    setItemDrafts((current) => ({ ...current, [listId]: "" }));
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

  const actionButtons = [
    { id: "labels" as const, label: "Labels", icon: Tag },
    { id: "dates" as const, label: "Dates", icon: Clock },
    { id: "members" as const, label: "Members", icon: UserPlus },
  ];

  return (
    <Dialog open={issue !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {issue ? (
          <div className="grid max-h-[92vh] overflow-y-auto md:grid-cols-[minmax(0,1fr)_22rem] md:overflow-hidden">
            <div className="space-y-6 p-6 md:max-h-[92vh] md:overflow-y-auto">
              <DialogHeader className="space-y-1">
                <DialogDescription>
                  {issue.id} · in list
                </DialogDescription>
                <DialogTitle className="sr-only">{issue.title}</DialogTitle>
                <Input
                  aria-label="Card title"
                  className="h-auto border-transparent bg-transparent px-1 text-2xl font-semibold shadow-none focus-visible:border-input"
                  value={issue.title}
                  onChange={(event) => onChange(issue.id, { title: event.target.value })}
                />
                <Select
                  value={issue.status}
                  onValueChange={(value) => value && onChange(issue.id, { status: value as IssueStatus })}
                >
                  <SelectTrigger className="w-44">
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
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                {actionButtons.map(({ id, label, icon: Icon }) => (
                  <Button key={id} variant="outline" onClick={() => setPanel(panel === id ? null : id)}>
                    <Icon />
                    {label}
                  </Button>
                ))}
                <Button variant="outline" onClick={addChecklist}>
                  <CheckSquare />
                  Checklist
                </Button>
              </div>

              {panel === "labels" ? (
                <Input
                  aria-label="Label"
                  value={issue.label === "None" ? "" : issue.label}
                  onChange={(event) => onChange(issue.id, { label: event.target.value || "None" })}
                  placeholder="Label, mis. Frontend"
                />
              ) : null}
              {panel === "dates" ? (
                <Input
                  aria-label="Due date"
                  type="date"
                  value={issue.dueDate ?? ""}
                  onChange={(event) => onChange(issue.id, { dueDate: event.target.value || undefined })}
                />
              ) : null}
              {panel === "members" ? (
                <Input
                  aria-label="Assignee"
                  value={issue.assignee === "Unassigned" ? "" : issue.assignee}
                  onChange={(event) => onChange(issue.id, { assignee: event.target.value || "Unassigned" })}
                  placeholder="Nama member"
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Badge variant={priorityVariant(issue.priority)}>{issue.priority}</Badge>
                <Badge variant="outline">{issue.team}</Badge>
                {issue.label !== "None" ? <Badge variant="secondary">{issue.label}</Badge> : null}
                {issue.assignee !== "Unassigned" ? <Badge variant="outline">{issue.assignee}</Badge> : null}
                {issue.dueDate ? <Badge variant="outline">Due {issue.dueDate}</Badge> : null}
              </div>

              <section className="grid gap-2">
                <h3 className="flex items-center gap-3 font-semibold">
                  <AlignLeft className="size-5" />
                  Description
                </h3>
                <Textarea
                  aria-label="Description"
                  value={issue.summary ?? ""}
                  onChange={(event) => onChange(issue.id, { summary: event.target.value })}
                  placeholder="Add a more detailed description..."
                />
              </section>

              {checklists.map((list) => {
                const done = list.items.filter((item) => item.done).length;
                const progress = list.items.length ? Math.round((done / list.items.length) * 100) : 0;
                const hidden = hideChecked[list.id] ?? false;

                return (
                  <section key={list.id} className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="size-5 shrink-0" />
                      <Input
                        aria-label="Checklist title"
                        className="h-8 flex-1 border-transparent bg-transparent px-1 font-semibold shadow-none focus-visible:border-input"
                        value={list.title}
                        onChange={(event) => patchChecklist(list.id, { title: event.target.value })}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHideChecked((current) => ({ ...current, [list.id]: !hidden }))}
                      >
                        {hidden ? `Show checked items (${done})` : "Hide checked items"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setChecklists(checklists.filter((item) => item.id !== list.id))}
                      >
                        Delete
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-10 text-xs text-muted-foreground">{progress}%</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full transition-all", progress === 100 ? "bg-emerald-500" : "bg-primary")}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <ul className="grid gap-1">
                      {list.items
                        .filter((item) => !(hidden && item.done))
                        .map((item) => (
                          <li key={item.id} className="flex items-center gap-3 rounded-md px-1 py-1 hover:bg-muted/50">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={item.done}
                              onChange={(event) =>
                                patchChecklist(list.id, {
                                  items: list.items.map((task) =>
                                    task.id === item.id ? { ...task, done: event.target.checked } : task
                                  ),
                                })
                              }
                            />
                            <Input
                              aria-label="Task text"
                              className={cn(
                                "h-8 flex-1 border-transparent bg-transparent px-1 shadow-none focus-visible:border-input",
                                item.done && "text-muted-foreground line-through"
                              )}
                              value={item.text}
                              onChange={(event) =>
                                patchChecklist(list.id, {
                                  items: list.items.map((task) =>
                                    task.id === item.id ? { ...task, text: event.target.value } : task
                                  ),
                                })
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Delete ${item.text}`}
                              onClick={() =>
                                patchChecklist(list.id, { items: list.items.filter((task) => task.id !== item.id) })
                              }
                            >
                              <Trash2 />
                            </Button>
                          </li>
                        ))}
                    </ul>

                    {addingItemTo === list.id ? (
                      <div className="space-y-2 pl-8">
                        <Input
                          autoFocus
                          value={itemDrafts[list.id] ?? ""}
                          onChange={(event) => setItemDrafts((current) => ({ ...current, [list.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") addItem(list.id);
                            if (event.key === "Escape") setAddingItemTo(null);
                          }}
                          placeholder="Add an item"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addItem(list.id)}>
                            Add
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setAddingItemTo(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-8">
                        <Button variant="outline" size="sm" onClick={() => setAddingItemTo(list.id)}>
                          Add an item
                        </Button>
                      </div>
                    )}
                  </section>
                );
              })}

              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Hapus card ${issue.id}?`)) onDelete(issue.id);
                  }}
                >
                  <Trash2 />
                  Delete card
                </Button>
              </div>
            </div>

            <aside className="space-y-4 border-t bg-muted/30 p-6 md:max-h-[92vh] md:overflow-y-auto md:border-t-0 md:border-l">
              <div className="flex items-center justify-between gap-2 pr-8">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="size-5" />
                  Comments and activity
                </h3>
                <Button variant="outline" size="sm" onClick={() => setShowDetails((current) => !current)}>
                  {showDetails ? "Hide details" : "Show details"}
                </Button>
              </div>

              <div className="grid gap-2">
                <Input
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addComment()}
                  placeholder="Write a comment..."
                />
                {commentText.trim() ? (
                  <div>
                    <Button size="sm" onClick={addComment}>
                      Save
                    </Button>
                  </div>
                ) : null}
              </div>

              <ul className="grid gap-4">
                {[...comments].reverse().map((comment) => (
                  <li key={comment.id} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {initials(comment.author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{comment.author}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString("id-ID")}
                        </span>
                      </p>
                      {editingCommentId === comment.id ? (
                        <div className="mt-1 grid gap-2">
                          <Textarea
                            value={editingCommentText}
                            onChange={(event) => setEditingCommentText(event.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                const text = editingCommentText.trim();
                                if (!text) return;
                                onChange(issue.id, {
                                  comments: comments.map((item) => (item.id === comment.id ? { ...item, text } : item)),
                                });
                                setEditingCommentId(null);
                              }}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg border bg-background px-3 py-2 text-sm">
                            {comment.text}
                          </p>
                          <div className="mt-1 flex gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditingCommentText(comment.text);
                              }}
                            >
                              <Pencil />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() =>
                                onChange(issue.id, { comments: comments.filter((item) => item.id !== comment.id) })
                              }
                            >
                              <Trash2 />
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}

                {showDetails ? (
                  <li className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {initials(issue.assignee === "Unassigned" ? CURRENT_AUTHOR : issue.assignee)}
                    </span>
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">
                          {issue.assignee === "Unassigned" ? CURRENT_AUTHOR : issue.assignee}
                        </span>{" "}
                        added this card to {issue.status}
                      </p>
                      <p className="text-xs text-muted-foreground">{issue.createdAt}</p>
                    </div>
                  </li>
                ) : null}
              </ul>
            </aside>
          </div>
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
      if (raw) {
        const stored = JSON.parse(raw) as (IssueRecord & { checklist?: { id: string; text: string; done: boolean }[] })[];
        setIssues(
          stored.map(({ checklist, ...issue }) =>
            checklist?.length && !issue.checklists?.length
              ? { ...issue, checklists: [{ id: newId("list"), title: "Checklist", items: checklist }] }
              : issue
          )
        );
      }
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

  function deleteIssue(issueId: string) {
    setIssues((current) => current.filter((issue) => issue.id !== issueId));
    setSelectedId(null);
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
        checklists: [],
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
        onDelete={deleteIssue}
      />
    </AppShell>
  );
}
