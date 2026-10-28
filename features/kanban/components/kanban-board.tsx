"use client";

import { useEffect, useMemo, useState } from "react";
import { AlignLeft, Archive, ArrowDown, ArrowUp, Ban, Check, FolderOpenDot, Link2, MoreHorizontal, CheckSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, GripVertical, ListFilter, MessageSquare, Pencil, Plus, Save, Search, Trash2, UserPlus, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  issues as initialIssues,
  kanbanColumns,
  type KanbanColumn,
  projectOptions,
  type IssueRecord,
  type IssueStatus,
} from "@/features/bug-tracker/data/bug-tracker-data";

const STORAGE_KEY = "bug-tracker:kanban-issues";
const COLUMNS_STORAGE_KEY = "bug-tracker:kanban-columns";
const CURRENT_AUTHOR = "You";

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

type DragState = {
  issueId: string | null;
  overColumn: IssueStatus | null;
};

function KanbanToolbar({
  showArchived,
  onToggleArchived,
  onOpenListGroup,
}: {
  showArchived: boolean;
  onToggleArchived: () => void;
  onOpenListGroup: () => void;
}) {
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
        <Button variant="outline" onClick={onOpenListGroup}>
          <ListFilter />
          List Group
        </Button>
        <Button variant="outline" onClick={onToggleArchived}>
          <Archive />
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
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
        "cursor-grab border border-foreground/15 bg-card dark:bg-zinc-800 shadow-md transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg active:cursor-grabbing",
        dragging && "opacity-55 ring-2 ring-primary/30",
        issue.inactive && "opacity-60 grayscale",
        issue.archived && "border-dashed"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              {issue.completed ? (
                <span
                  aria-label="Completed"
                  className="flex size-4 shrink-0 items-center justify-center rounded-full bg-lime-500 text-zinc-900"
                >
                  <Check className="size-2.5" strokeWidth={3.5} />
                </span>
              ) : null}
              {issue.id}
              {issue.archived ? <span className="text-xs font-normal text-muted-foreground">Archived</span> : null}
              {issue.inactive ? <span className="text-xs font-normal text-muted-foreground">Inactive</span> : null}
            </CardTitle>
            <CardDescription className="mt-1 leading-6 text-foreground/90">
              {issue.title}
            </CardDescription>
          </div>
          <GripVertical className="mt-0.5 size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 empty:hidden">
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
        "relative flex h-full min-h-[32rem] flex-col border border-border/80 bg-muted dark:bg-black/40 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/80 before:content-['']",
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

function CompleteToggle({ completed, onToggle }: { completed: boolean; onToggle: () => void }) {
  const [burstKey, setBurstKey] = useState(0);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-pressed={completed}
            aria-label={completed ? "Mark incomplete" : "Mark complete"}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => {
              if (!completed) setBurstKey((current) => current + 1);
              onToggle();
            }}
          />
        }
      >
        <span
          key={completed ? "done" : "open"}
          className={cn(
            "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
            completed
              ? "animate-complete-pop border-emerald-500 bg-emerald-500 text-white"
              : "border-muted-foreground hover:border-foreground"
          )}
        >
          {completed ? <Check className="size-4" strokeWidth={3} /> : null}
        </span>
        {completed && burstKey > 0 ? (
          <span key={burstKey} aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: 8 }, (_, index) => (
              <span
                key={index}
                className="animate-complete-ray absolute top-1/2 left-1/2 -mt-1 -ml-px h-2 w-0.5 rounded-full bg-emerald-400"
                style={{ "--ray-angle": `${index * 45}deg` } as React.CSSProperties}
              />
            ))}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent>{completed ? "Mark incomplete" : "Mark complete"}</TooltipContent>
    </Tooltip>
  );
}

type DetailPanel = "dates" | "members" | "issues" | null;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const REMINDER_OPTIONS = [
  { value: "none", label: "None" },
  { value: "at-time", label: "At time of due date" },
  { value: "5m", label: "5 Minutes before" },
  { value: "10m", label: "10 Minutes before" },
  { value: "15m", label: "15 Minutes before" },
  { value: "1h", label: "1 Hour before" },
  { value: "2h", label: "2 Hours before" },
  { value: "1d", label: "1 Day before" },
  { value: "2d", label: "2 Days before" },
];

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateTime(date: string, time?: string) {
  const [year, month, day] = date.split("-");
  return `${Number(day)}/${Number(month)}/${year}${time ? ` ${time}` : ""}`;
}

type DatesDraft = {
  startEnabled: boolean;
  start: string;
  dueEnabled: boolean;
  due: string;
  time: string;
  reminder: string;
};

function DatesPopover({
  issue,
  onSave,
  onRemove,
  onClose,
}: {
  issue: IssueRecord;
  onSave: (patch: Pick<IssueRecord, "startDate" | "dueDate" | "dueTime" | "reminder">) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const today = new Date();
  const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
  const [draft, setDraft] = useState<DatesDraft>({
    startEnabled: Boolean(issue.startDate),
    start: issue.startDate ?? "",
    dueEnabled: Boolean(issue.dueDate),
    due: issue.dueDate ?? "",
    time: issue.dueTime ?? "12:00",
    reminder: issue.reminder ?? "none",
  });
  const anchor = draft.due || draft.start || todayIso;
  const [view, setView] = useState({ year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) - 1 });
  const [target, setTarget] = useState<"start" | "due">("due");

  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(view.year, view.month, index - firstWeekday + 1);
    return {
      iso: toIsoDate(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === view.month,
    };
  });
  const monthLabel = new Date(view.year, view.month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  function shift(months: number) {
    const next = new Date(view.year, view.month + months, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  }

  function pick(iso: string) {
    if (target === "start" && draft.startEnabled) setDraft({ ...draft, start: iso });
    else setDraft({ ...draft, dueEnabled: true, due: iso });
  }

  function save() {
    onSave({
      startDate: draft.startEnabled && draft.start ? draft.start : undefined,
      dueDate: draft.dueEnabled && draft.due ? draft.due : undefined,
      dueTime: draft.dueEnabled && draft.due ? draft.time : undefined,
      reminder: draft.dueEnabled && draft.due && draft.reminder !== "none" ? draft.reminder : undefined,
    });
    onClose();
  }

  return (
    <div className="absolute top-full left-0 z-20 mt-2 w-80 rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="relative mb-3 text-center text-sm font-semibold">
        Dates
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Close dates"
          className="absolute top-1/2 right-0 -translate-y-1/2"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="flex">
          <Button variant="ghost" size="icon-sm" aria-label="Previous year" onClick={() => shift(-12)}>
            <ChevronsLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
        </div>
        <span className="text-sm font-semibold">{monthLabel}</span>
        <div className="flex">
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next year" onClick={() => shift(12)}>
            <ChevronsRight />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1 font-semibold">
            {weekday}
          </span>
        ))}
        {cells.map((cell) => {
          const isDue = draft.dueEnabled && draft.due === cell.iso;
          const isStart = draft.startEnabled && draft.start === cell.iso;

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => pick(cell.iso)}
              className={cn(
                "h-8 rounded-md text-sm hover:bg-muted",
                !cell.inMonth && "text-muted-foreground/60",
                cell.iso === todayIso && "underline decoration-primary decoration-2 underline-offset-4",
                (isDue || isStart) && "bg-primary/20 font-semibold text-primary"
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <span className="text-xs font-semibold">Start date</span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              aria-label="Enable start date"
              checked={draft.startEnabled}
              onChange={(event) => {
                setTarget("start");
                setDraft({ ...draft, startEnabled: event.target.checked, start: draft.start || todayIso });
              }}
            />
            <Input
              type="date"
              aria-label="Start date"
              disabled={!draft.startEnabled}
              value={draft.start}
              onFocus={() => setTarget("start")}
              onChange={(event) => setDraft({ ...draft, start: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-semibold">Due date</span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              aria-label="Enable due date"
              checked={draft.dueEnabled}
              onChange={(event) => {
                setTarget("due");
                setDraft({ ...draft, dueEnabled: event.target.checked, due: draft.due || todayIso });
              }}
            />
            <Input
              type="date"
              aria-label="Due date"
              disabled={!draft.dueEnabled}
              value={draft.due}
              onFocus={() => setTarget("due")}
              onChange={(event) => setDraft({ ...draft, due: event.target.value })}
            />
            <Input
              type="time"
              aria-label="Due time"
              className="w-28"
              disabled={!draft.dueEnabled}
              value={draft.time}
              onChange={(event) => setDraft({ ...draft, time: event.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-semibold">Set due date reminder</span>
          <Select
            value={draft.reminder}
            onValueChange={(value) => setDraft({ ...draft, reminder: value ?? "none" })}
          >
            <SelectTrigger className="w-full" disabled={!draft.dueEnabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={save}>Save</Button>
        <Button
          variant="outline"
          onClick={() => {
            onRemove();
            onClose();
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}

function IssueDetailDialog({
  issue,
  onClose,
  onChange,
  members,
  allIssues,
}: {
  issue: IssueRecord | null;
  members: string[];
  allIssues: Pick<IssueRecord, "id" | "title">[];
  onClose: () => void;
  onChange: (issueId: string, patch: Partial<IssueRecord>) => void;
}) {
  const [panel, setPanel] = useState<DetailPanel>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [issueQuery, setIssueQuery] = useState("");
  const [hideChecked, setHideChecked] = useState<Record<string, boolean>>({});
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({});
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentText, setCommentText] = useState("");
  const checklists = issue?.checklists ?? [];
  const comments = issue?.comments ?? [];
  const linkedIssues = issue?.linkedIssues ?? [];
  const filteredIssues = allIssues.filter(
    (item) =>
      item.id !== issue?.id &&
      `${item.id} ${item.title}`.toLowerCase().includes(issueQuery.trim().toLowerCase())
  );
  const cardMembers = issue?.members ?? (issue && issue.assignee !== "Unassigned" ? [issue.assignee] : []);
  const joined = cardMembers.includes(CURRENT_AUTHOR);

  function setCardMembers(next: string[]) {
    if (issue) onChange(issue.id, { members: next, assignee: next[0] ?? "Unassigned" });
  }

  function toggleJoin() {
    setCardMembers(joined ? cardMembers.filter((name) => name !== CURRENT_AUTHOR) : [...cardMembers, CURRENT_AUTHOR]);
  }

  useEffect(() => {
    if (!issue) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.code !== "Space" || event.repeat) return;
      if (target?.closest("input, textarea, select, button, [contenteditable], [role='switch']")) return;

      event.preventDefault();
      toggleJoin();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // toggleJoin closes over the current members, so re-bind when they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id, joined, cardMembers.length]);

  const filteredMembers = members.filter((name) => name.toLowerCase().includes(memberQuery.trim().toLowerCase()));

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
    { id: "dates" as const, label: "Dates", icon: Clock },
    { id: "members" as const, label: "Members", icon: UserPlus },
  ];

  return (
    <Dialog open={issue !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[92vh] max-h-[92vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        {issue ? (
          <div className="grid h-full grid-rows-[auto] overflow-y-auto md:grid-cols-[minmax(0,1fr)_26rem] md:grid-rows-1 md:overflow-hidden">
            <div className="space-y-6 p-6 md:h-full md:overflow-y-auto">
              <DialogHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2 pr-1">
                  <DialogDescription>{issue.id} · in list</DialogDescription>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label="Card actions" />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem className="justify-between" onClick={toggleJoin}>
                        <span className="flex items-center gap-2">
                          <UserPlus className="size-4" />
                          {joined ? "Leave" : "Join"}
                        </span>
                        <DropdownMenuShortcut>Space</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChange(issue.id, { inactive: !issue.inactive })}>
                        <Ban className="size-4" />
                        {issue.inactive ? "Make active" : "Make inactive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          onChange(issue.id, { archived: !issue.archived });
                          if (!issue.archived) onClose();
                        }}
                      >
                        <Archive className="size-4" />
                        {issue.archived ? "Send to board" : "Archive"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <DialogTitle className="sr-only">{issue.title}</DialogTitle>
                <div className="flex items-center gap-2">
                  <CompleteToggle
                    completed={Boolean(issue.completed)}
                    onToggle={() => onChange(issue.id, { completed: !issue.completed })}
                  />
                  <Input
                    aria-label="Card title"
                    className="h-auto border-transparent bg-transparent px-1 text-2xl font-semibold shadow-none focus-visible:border-input"
                    value={issue.title}
                    onChange={(event) => onChange(issue.id, { title: event.target.value })}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={issue.project ?? "none"}
                    onValueChange={(value) =>
                      onChange(issue.id, { project: !value || value === "none" ? undefined : value })
                    }
                  >
                    <SelectTrigger className="w-56">
                      <FolderOpenDot />
                      <SelectValue placeholder="Tag project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projectOptions.map((project) => (
                        <SelectItem key={project.value} value={project.value}>
                          {project.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Button variant="outline" onClick={() => setPanel(panel === "issues" ? null : "issues")}>
                      <Link2 />
                      Link issue
                    </Button>
                    {panel === "issues" ? (
                      <div className="absolute top-full left-0 z-20 mt-2 w-80 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
                        <div className="relative mb-3 text-center text-sm font-semibold">
                          Issues
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Close issues"
                            className="absolute top-1/2 right-0 -translate-y-1/2"
                            onClick={() => setPanel(null)}
                          >
                            <X />
                          </Button>
                        </div>
                        <Input
                          autoFocus
                          aria-label="Search issues"
                          value={issueQuery}
                          onChange={(event) => setIssueQuery(event.target.value)}
                          placeholder="Search issues"
                        />
                        <ul className="mt-3 grid max-h-60 gap-1 overflow-y-auto">
                          {filteredIssues.length ? (
                            filteredIssues.map((item) => {
                              const linked = linkedIssues.includes(item.id);

                              return (
                                <li key={item.id}>
                                  <button
                                    type="button"
                                    className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() =>
                                      onChange(issue.id, {
                                        linkedIssues: linked
                                          ? linkedIssues.filter((id) => id !== item.id)
                                          : [...linkedIssues, item.id],
                                      })
                                    }
                                  >
                                    <span className="flex-1">
                                      <span className="font-medium">{item.id}</span>
                                      <span className="block text-xs text-muted-foreground">{item.title}</span>
                                    </span>
                                    {linked ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
                                  </button>
                                </li>
                              );
                            })
                          ) : (
                            <li className="px-2 py-2 text-sm text-muted-foreground">No issues found.</li>
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                {actionButtons.map(({ id, label, icon: Icon }) => (
                  <div key={id} className="relative">
                    <Button variant="outline" onClick={() => setPanel(panel === id ? null : id)}>
                      <Icon />
                      {label}
                    </Button>
                    {id === "dates" && panel === "dates" ? (
                      <DatesPopover
                        issue={issue}
                        onClose={() => setPanel(null)}
                        onRemove={() =>
                          onChange(issue.id, { startDate: undefined, dueDate: undefined, dueTime: undefined, reminder: undefined })
                        }
                        onSave={(patch) => onChange(issue.id, patch)}
                      />
                    ) : null}
                    {id === "members" && panel === "members" ? (
                      <div className="absolute top-full left-0 z-20 mt-2 w-72 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
                        <div className="relative mb-3 text-center text-sm font-semibold">
                          Members
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Close members"
                            className="absolute top-1/2 right-0 -translate-y-1/2"
                            onClick={() => setPanel(null)}
                          >
                            <X />
                          </Button>
                        </div>
                        <Input
                          autoFocus
                          aria-label="Search members"
                          value={memberQuery}
                          onChange={(event) => setMemberQuery(event.target.value)}
                          placeholder="Search members"
                        />
                        <p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">Board members</p>
                        <ul className="grid max-h-60 gap-1 overflow-y-auto">
                          {filteredMembers.length ? (
                            filteredMembers.map((name) => {
                              const selected = cardMembers.includes(name);

                              return (
                                <li key={name}>
                                  <button
                                    type="button"
                                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                                    onClick={() =>
                                      setCardMembers(selected ? cardMembers.filter((item) => item !== name) : [...cardMembers, name])
                                    }
                                  >
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                                      {initials(name)}
                                    </span>
                                    <span className="flex-1 truncate">{name}</span>
                                    {selected ? <Check className="size-4" /> : null}
                                  </button>
                                </li>
                              );
                            })
                          ) : (
                            <li className="px-2 py-2 text-sm text-muted-foreground">No members found.</li>
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
                <Button variant="outline" onClick={addChecklist}>
                  <CheckSquare />
                  Checklist
                </Button>
              </div>


              <div className="flex flex-wrap gap-2">
                {cardMembers.map((name) => (
                  <Badge key={name} variant="outline">
                    {name}
                  </Badge>
                ))}
                {issue.archived ? <Badge variant="secondary">Archived</Badge> : null}
                {issue.inactive ? <Badge variant="secondary">Inactive</Badge> : null}
                {issue.startDate ? <Badge variant="outline">Start {formatDateTime(issue.startDate)}</Badge> : null}
                {issue.dueDate ? <Badge variant="outline">Due {formatDateTime(issue.dueDate, issue.dueTime)}</Badge> : null}
              </div>

              {linkedIssues.length ? (
                <section className="grid gap-2">
                  <h3 className="flex items-center gap-3 font-semibold">
                    <Link2 className="size-5" />
                    Linked issues
                  </h3>
                  <ul className="grid gap-1">
                    {linkedIssues.map((id) => (
                      <li key={id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <span className="font-medium">{id}</span>
                        <span className="flex-1 truncate text-muted-foreground">
                          {allIssues.find((item) => item.id === id)?.title ?? ""}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Unlink ${id}`}
                          onClick={() => onChange(issue.id, { linkedIssues: linkedIssues.filter((item) => item !== id) })}
                        >
                          <X />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

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

            </div>

            <aside className="min-h-[28rem] space-y-4 border-t bg-muted/30 p-6 md:h-full md:overflow-y-auto md:border-t-0 md:border-l">
              <div className="flex items-center justify-between gap-2 pr-8">
                <h3 className="flex items-center gap-2 font-semibold whitespace-nowrap">
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
  const [showArchived, setShowArchived] = useState(false);
  const [isListGroupOpen, setIsListGroupOpen] = useState(false);
  const [draftColumns, setDraftColumns] = useState<KanbanColumn[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>(() =>
    kanbanColumns.filter((column) => column.id !== "Backlog")
  );
  const [userNames, setUserNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedColumns = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (storedColumns) setColumns(JSON.parse(storedColumns) as KanbanColumn[]);
    } catch {
      // ignore unreadable storage and keep default lists
    }
  }, []);

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
    fetch("/api/users?pageSize=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { data?: { Name: string }[] } | null) => setUserNames((body?.data ?? []).map((user) => user.Name)))
      .catch(() => setUserNames([]));
  }, []);

  const members = useMemo(
    () => [
      ...new Set([
        CURRENT_AUTHOR,
        ...userNames,
        ...issues.map((issue) => issue.assignee).filter((name) => name && name !== "Unassigned"),
      ]),
    ],
    [issues, userNames]
  );

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
      columns.map((column) => ({
        ...column,
        issues: issues.filter((issue) => issue.status === column.id && (showArchived || !issue.archived)),
      })),
    [columns, issues, showArchived]
  );

  function updateColumns(next: KanbanColumn[]) {
    setColumns(next);
    try {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable; changes stay in memory only
    }
  }

  function saveColumns() {
    const cleaned = draftColumns.map((column) => ({ ...column, title: column.title.trim() || "Untitled list" }));
    if (!cleaned.length) return;

    // Cards of a deleted list move to the first remaining list instead of disappearing.
    const keptIds = new Set(cleaned.map((column) => column.id));
    setIssues((current) =>
      current.map((issue) => (keptIds.has(issue.status) ? issue : { ...issue, status: cleaned[0].id }))
    );
    updateColumns(cleaned);
    setIsListGroupOpen(false);
  }

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
      toolbar={
        <KanbanToolbar
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((current) => !current)}
          onOpenListGroup={() => {
            setDraftColumns(columns);
            setIsListGroupOpen(true);
          }}
        />
      }
    >
      <Dialog open={isListGroupOpen} onOpenChange={setIsListGroupOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>List Group</DialogTitle>
            <DialogDescription>Atur nama dan deskripsi list di board, atau tambah list baru.</DialogDescription>
          </DialogHeader>

          <ul className="grid gap-3">
            {draftColumns.map((column, index) => (
              <li key={column.id} className="grid gap-2 rounded-xl border bg-muted/30 p-3">
                <div className="flex items-end gap-2">
                  <div className="grid flex-1 gap-1.5">
                    <label htmlFor={`list-name-${column.id}`} className="text-xs font-medium text-muted-foreground">
                      Nama list
                    </label>
                    <Input
                      id={`list-name-${column.id}`}
                      className="font-medium"
                      value={column.title}
                      onChange={(event) =>
                        setDraftColumns(draftColumns.map((item) => (item.id === column.id ? { ...item, title: event.target.value } : item)))
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...draftColumns];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      setDraftColumns(next);
                    }}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={index === draftColumns.length - 1}
                    onClick={() => {
                      const next = [...draftColumns];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      setDraftColumns(next);
                    }}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${column.title}`}
                    disabled={draftColumns.length <= 1}
                    onClick={() => setDraftColumns(draftColumns.filter((item) => item.id !== column.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor={`list-desc-${column.id}`} className="text-xs font-medium text-muted-foreground">
                    Deskripsi
                  </label>
                  <Input
                    id={`list-desc-${column.id}`}
                    value={column.description}
                    onChange={(event) =>
                      setDraftColumns(draftColumns.map((item) => (item.id === column.id ? { ...item, description: event.target.value } : item)))
                    }
                    placeholder="Deskripsi singkat list ini"
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setDraftColumns([...draftColumns, { id: newId("list"), title: "New list", description: "" }])}
            >
              <Plus />
              Add list
            </Button>
            <Button onClick={saveColumns}>
              <Save />
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card>
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
        members={members}
        allIssues={issues.map(({ id, title }) => ({ id, title }))}
        onClose={() => setSelectedId(null)}
        onChange={updateIssue}
      />
    </AppShell>
  );
}
