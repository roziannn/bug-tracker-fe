"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlignLeft, ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesColumn, Check, CheckCircle2, CircleDot, CircleX, ClipboardCheck, ClipboardList, Download, ExternalLink, FileUp, FolderKanban, History, MessageSquare, Pause, Paperclip, Reply, RotateCcw, Save, Send, SquarePen, Trash2, UserRound, X, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/components/app/user-provider";
import { RichTextEditor, sanitizeRichText } from "@/components/ui/rich-text-editor";
import { MentionText, MentionTextarea } from "@/features/issues/components/database-issue-detail-page";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import type { Project, User } from "@/types";

type RequestDetail = {
  id: string; number: string; title: string; description: string; type: string; priority: string; status: string;
  projectId: string | null; project: string | null; requesterId: number | null; requester: string | null; picId: number | null; pic: string | null;
  businessJustification: string; requestedTargetDate: string | null; estimatedEffort: string; reviewComment: string;
  createdBy: string | null; createdAt: string; updatedBy: string | null; updatedAt: string | null; attachments: { id: number; name: string; size: number; mimeType: string }[];
  comments: { id: number; parentCommentId: number | null; author: string; body: string; createdAt: string }[];
  activities: { id: number; actor: string; actorRole: string | null; action: string; detail: string; createdAt: string }[];
  issues: { id: string; number: string; title: string }[];
};
type NewAttachment = { name: string; size: number; mimeType: string; contentBase64: string };
const requestTypes = ["New Feature", "Enhancement", "Data/Report Request", "Lainnya"];
const priorities = ["Low", "Medium", "High", "Critical"];
const reviewTemplates = ["oke ditampung", "Needs Benchmark", "Architecture Approved", "Security Sign-off"];
const serviceRequestStatuses = ["Draft", "Submitted", "In Review", "Approved", "In Progress", "Done", "Rejected", "Returned", "On Hold", "Cancelled"];
const statusOptions: Record<string, string[]> = {
  Draft: ["Submitted", "Cancelled"], Submitted: ["In Review", "Cancelled"], "In Review": ["Approved", "Rejected", "Returned", "On Hold"],
  Approved: ["In Progress", "On Hold", "Cancelled"], "In Progress": ["Done", "On Hold", "Cancelled"], "On Hold": ["In Review", "Approved", "In Progress", "Cancelled"],
  Rejected: [], Returned: [], Done: [], Cancelled: [],
};

function formatSize(size: number) { return size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : size >= 1024 ? `${Math.round(size / 1024)} KB` : `${size} B`; }

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase() || "?";
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim();
}

function formatRelativeTime(value: string) {
  const elapsedSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(elapsedSeconds) >= seconds) return formatter.format(Math.round(elapsedSeconds / seconds), unit);
  }
  return formatter.format(elapsedSeconds, "second");
}

function ActivityDetail({ detail }: { detail: string }) {
  const [from, to] = detail.split(" → ");
  return from !== undefined && to !== undefined
    ? <span className="inline-flex flex-wrap items-center gap-1.5">{from}<ArrowRight aria-hidden="true" className="size-3.5" />{to}</span>
    : <>{detail}</>;
}

function isStatusTransition(detail: string) {
  const [from, to, ...rest] = detail.split(" → ");
  return rest.length === 0 && serviceRequestStatuses.includes(from) && serviceRequestStatuses.includes(to);
}

function DecisionBadge({ decision }: { decision: string }) {
  const styles: Record<string, { icon: typeof CheckCircle2; className: string }> = {
    Done: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" },
    Approved: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" },
    "In Progress": { icon: CircleDot, className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300" },
    "In Review": { icon: ClipboardCheck, className: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300" },
    Returned: { icon: RotateCcw, className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" },
    "On Hold": { icon: Pause, className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" },
    Cancelled: { icon: CircleX, className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" },
    Rejected: { icon: XCircle, className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" },
    "Review note": { icon: MessageSquare, className: "border-border bg-muted/60 text-muted-foreground" },
  };
  const config = styles[decision] ?? styles["Review note"];
  const Icon = config.icon;
  return <Badge variant="outline" className={`inline-flex items-center gap-1.5 whitespace-nowrap ${config.className}`}><Icon className="size-3" />{decision}</Badge>;
}

export function ServiceRequestDetailPage({ id }: { id: string }) {
  const { user: currentUser } = useCurrentUser();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftType, setDraftType] = useState("New Feature");
  const [draftPriority, setDraftPriority] = useState("Medium");
  const [draftProjectName, setDraftProjectName] = useState("");
  const [draftPicId, setDraftPicId] = useState("");
  const [draftJustification, setDraftJustification] = useState("");
  const [draftTargetDate, setDraftTargetDate] = useState("");
  const [keptAttachmentIds, setKeptAttachmentIds] = useState<number[]>([]);
  const [newAttachments, setNewAttachments] = useState<NewAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commentOrder, setCommentOrder] = useState<"oldest" | "newest">("oldest");
  const [picDialogOpen, setPicDialogOpen] = useState(false);
  const [progressPicId, setProgressPicId] = useState("");
  const [progressPriority, setProgressPriority] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "Service request not found" : "Unable to load service request");
      const item = await response.json() as RequestDetail;
      setRequest(item);
      setDraftTitle(item.title);
      setDraftDescription(item.description);
      setDraftType(item.type);
      setDraftPriority(item.priority);
      setDraftProjectName(item.project ?? "");
      setDraftPicId(item.picId ? String(item.picId) : "");
      setDraftJustification(item.businessJustification);
      setDraftTargetDate(item.requestedTargetDate ?? "");
      setKeptAttachmentIds(item.attachments.map((file) => file.id));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load service request"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    void load();
    fetch("/api/users?pageSize=100", { cache: "no-store" }).then((r) => r.ok ? r.json() : { data: [] }).then((result) => setUsers(result.data ?? [])).catch(() => setUsers([]));
    fetch("/api/projects", { cache: "no-store" }).then((r) => r.ok ? r.json() : []).then(setProjects).catch(() => setProjects([]));
  }, [load]);

  async function addDraftAttachments(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    let count = (request?.attachments.filter((file) => keptAttachmentIds.includes(file.id)).length ?? 0) + newAttachments.length;
    let total = request?.attachments.filter((file) => keptAttachmentIds.includes(file.id)).reduce((sum, file) => sum + file.size, 0) ?? 0;
    total += newAttachments.reduce((sum, file) => sum + file.size, 0);
    const accepted = files.filter((file) => {
      if (count >= 20 || file.size > 5 * 1024 * 1024 || total + file.size > 15 * 1024 * 1024) return false;
      count += 1;
      total += file.size;
      return true;
    });
    if (accepted.length < files.length) appToast.error({ title: "Some files were skipped", description: "Add up to 20 attachments, 5 MB each and 15 MB total." });
    try {
      const encoded = await Promise.all(accepted.map(async (file) => ({
        name: file.name, size: file.size, mimeType: file.type,
        contentBase64: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
          reader.readAsDataURL(file);
        }),
      })));
      setNewAttachments((current) => [...current, ...encoded].slice(0, 20));
    } catch (err) { appToast.error({ title: "Unable to read attachment", description: err instanceof Error ? err.message : undefined }); }
  }

  async function uploadRequestAttachments(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length || !request) return;
    let count = request.attachments.length;
    let total = request.attachments.reduce((sum, file) => sum + file.size, 0);
    const accepted = files.filter((file) => {
      if (count >= 20 || file.size > 5 * 1024 * 1024 || total + file.size > 15 * 1024 * 1024) return false;
      count += 1;
      total += file.size;
      return true;
    });
    if (!accepted.length) {
      appToast.error({ title: "No files added", description: "Add up to 20 attachments, 5 MB each and 15 MB total." });
      return;
    }
    setUploadingAttachments(true);
    try {
      const attachments = await Promise.all(accepted.map(async (file) => ({
        name: file.name, size: file.size, mimeType: file.type,
        contentBase64: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
          reader.readAsDataURL(file);
        }),
      })));
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}/attachments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachments }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to upload attachments");
      await load();
      appToast.success({ title: "Files uploaded", description: `${attachments.length} file${attachments.length === 1 ? "" : "s"} added to this request.` });
    } catch (err) {
      appToast.error({ title: "Unable to upload files", description: err instanceof Error ? err.message : undefined });
    } finally { setUploadingAttachments(false); }
  }

  async function saveDraft(submit: boolean) {
    if (!request) return;
    const selectedProject = projects.find((project) => project.Name === draftProjectName);
    if (submit && (!draftTitle.trim() || !draftDescription.trim() || !draftJustification.trim() || !selectedProject)) {
      appToast.error({ title: "Complete required fields", description: "Title, description, business justification, and project are required to submit." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftAction: submit ? "submit" : "save", title: draftTitle, description: draftDescription,
          type: draftType, priority: draftPriority, projectId: selectedProject?.NewId ?? null,
          picId: draftPicId ? Number(draftPicId) : null, businessJustification: draftJustification,
          requestedTargetDate: draftTargetDate || null, keptAttachmentIds,
          attachments: newAttachments,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to save request");
      setNewAttachments([]);
      await load();
      appToast.success({ title: submit ? "Request submitted" : request.status === "Returned" ? "Changes saved" : "Draft saved", description: submit ? "Your request is ready for review." : request.status === "Returned" ? "The returned request was updated." : "Your draft changes were saved." });
    } catch (err) { appToast.error({ title: "Unable to save request", description: err instanceof Error ? err.message : undefined }); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: string, picId?: number, priority?: string) {
    if (!request) return;
    if (status === "Returned" && !plainText(reviewComment)) {
      appToast.error({ title: "Return reason required", description: "Add a reason before returning this request to the requester." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reviewComment, picId, priority }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to update status");
      setPicDialogOpen(false);
      setReviewComment(""); await load(); appToast.success({ title: "Request updated", description: `Status changed to ${status}.` });
    } catch (err) { appToast.error({ title: "Unable to update request", description: err instanceof Error ? err.message : undefined }); }
    finally { setBusy(false); }
  }

  async function postComment(body: string, parentCommentId: number | null = null) {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, parentCommentId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to post comment");
      setCommentText(""); setReplyText(""); setReplyTo(null); await load();
    } catch (err) { appToast.error({ title: "Unable to post comment", description: err instanceof Error ? err.message : undefined }); }
    finally { setBusy(false); }
  }

  async function confirmInProgress() {
    if (!progressPicId || !progressPriority) {
      appToast.error({ title: "PIC and priority required", description: "Choose both a PIC and priority before moving this request to In Progress." });
      return;
    }
    await changeStatus("In Progress", Number(progressPicId), progressPriority);
  }

  if (loading) return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: "Loading" }]} eyebrow="Request detail" title="Service Request"><Skeleton className="h-96 w-full rounded-xl" /></AppShell>;
  if (!request) return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: "Not found" }]} eyebrow="Request detail" title="Service Request"><Card><CardHeader><CardTitle>{error || "Service request not found"}</CardTitle></CardHeader><CardContent><Button nativeButton={false} render={<Link href="/service-requests" />} variant="outline"><ArrowLeft />Back to requests</Button></CardContent></Card></AppShell>;

  const roots = request.comments.filter((comment) => !comment.parentCommentId);
  const orderedRoots = [...roots].sort((a, b) => commentOrder === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const participantCount = new Set(request.comments.map((comment) => comment.author)).size;
  const lastComment = request.comments.at(-1);
  const currentStatusOptions = statusOptions[request.status] ?? [];
  const secondaryStatusOptions = ["On Hold", "Cancelled"].filter((status) => currentStatusOptions.includes(status));
  const isEditableRequest = request.status === "Draft" || request.status === "Returned";
  const reviewLogs = request.activities.filter((activity) => activity.action.startsWith("Status changed to ") || activity.action === "Review updated");
  const initiator = request.activities.find((activity) => activity.action === "Draft created" || activity.action === "Request submitted")?.actor ?? request.requester ?? "—";
  return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: request.number }]} eyebrow="Request detail" title={request.number} toolbar={<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{request.title || "Untitled draft"}</h2><p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground"><span>Created on <span className="font-medium text-foreground">{formatDate(request.createdAt)}</span></span><span aria-hidden="true">·</span><span>Initiated by <span className="font-medium text-foreground">{initiator}</span></span><span aria-hidden="true">·</span><span>Last modified <span className="font-medium text-foreground">{formatRelativeTime(request.updatedAt ?? request.createdAt)}</span></span></p></div><Button nativeButton={false} render={<Link href="/service-requests" />} variant="outline"><ArrowLeft />Back to requests</Button></div>}>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
      <Card className="lg:col-span-2"><CardContent className="grid grid-cols-1 p-0 sm:grid-cols-2 xl:grid-cols-5">
        <section className="min-w-0 border-b px-4 py-3 sm:border-r xl:border-b-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Status &amp; Type</p><div className="flex flex-wrap items-center gap-1.5"><Badge variant="outline" className="gap-1.5"><span className="size-1.5 rounded-full bg-primary" />{request.status}</Badge><Badge variant="secondary">{request.type}</Badge></div></section>
        <section className="min-w-0 border-b px-4 py-3 xl:border-r xl:border-b-0"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Project &amp; Priority</p>{request.projectId ? <Link href={`/projects/${request.projectId}`} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-primary" aria-label="View project" title="View project">View project<ExternalLink className="size-3" /></Link> : null}</div><div className="flex min-w-0 items-center gap-2"><FolderKanban className="size-4 shrink-0 text-primary" /><span className="truncate text-sm font-medium">{request.project ?? "No project"}</span><Badge variant="outline" className="ml-auto shrink-0">{request.priority}</Badge></div></section>
        <section className="min-w-0 border-b px-4 py-3 sm:border-r xl:border-b-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requester</p><div className="flex min-w-0 items-center gap-2"><UserRound className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium">{request.requester ?? "—"}</span></div></section>
        <section className="min-w-0 border-b px-4 py-3 xl:border-r xl:border-b-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned PIC</p><div className="flex min-w-0 items-center gap-2"><UserRound className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium">{request.pic ?? "—"}</span></div></section>
        <section className="min-w-0 px-4 py-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Requested Target</p><div className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-muted-foreground" /><span className="text-sm font-medium">{request.requestedTargetDate ?? "—"}</span></div></section>
      </CardContent></Card>
      <Tabs defaultValue="overview" className="gap-0 lg:col-span-2">
        <div className="border-b"><div className="overflow-x-auto"><TabsList variant="line" className="h-10 w-max min-w-full items-stretch justify-start gap-6 rounded-none border-0 bg-transparent p-0">
          <TabsTrigger value="overview" className="h-full flex-none cursor-pointer items-center justify-start gap-2 rounded-none px-1 text-sm font-medium text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary data-active:shadow-none after:inset-x-0 after:bottom-0! after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-active:after:opacity-100 [&_svg]:size-4 [&_svg]:shrink-0"><ClipboardList />Overview</TabsTrigger>
          {request.status !== "Draft" ? <TabsTrigger value="review" className="h-full flex-none cursor-pointer items-center justify-start gap-2 rounded-none px-1 text-sm font-medium text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary data-active:shadow-none after:inset-x-0 after:bottom-0! after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-active:after:opacity-100 [&_svg]:size-4 [&_svg]:shrink-0"><Check />Review &amp; Approval{request.status === "Submitted" || request.status === "In Review" ? <Badge variant="secondary" className="ml-1 bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pending</Badge> : null}</TabsTrigger> : null}
          <TabsTrigger value="discussion" className="h-full flex-none cursor-pointer items-center justify-start gap-2 rounded-none px-1 text-sm font-medium text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary data-active:shadow-none after:inset-x-0 after:bottom-0! after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-active:after:opacity-100 [&_svg]:size-4 [&_svg]:shrink-0"><MessageSquare />Discussion <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{request.comments.length}</span></TabsTrigger>
          <TabsTrigger value="activity" className="h-full flex-none cursor-pointer items-center justify-start gap-2 rounded-none px-1 text-sm font-medium text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary data-active:shadow-none after:inset-x-0 after:bottom-0! after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 data-active:after:opacity-100 [&_svg]:size-4 [&_svg]:shrink-0"><History />Activity</TabsTrigger>
        </TabsList></div></div>
        <div className="pt-5 pb-5">
          <TabsContent value="overview" className="space-y-5">
            {isEditableRequest ? <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold">{request.status === "Returned" ? "This request was returned" : "This request is still a draft"}</h3><p className="mt-1 text-sm text-muted-foreground">{request.status === "Returned" ? "Update the details below, then submit the request again." : "Edit the details below, then save or submit it for review."}</p></div><Badge variant="outline">{request.status}</Badge></div>
              <Card><CardHeader><CardTitle>Request details</CardTitle><p className="text-sm text-muted-foreground">Update the request title, type, and description.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-[2fr_2fr]">
                <div className="grid min-w-0 gap-2"><Label htmlFor="draft-title">Title *</Label><Input id="draft-title" maxLength={255} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} /></div>
                <div className="grid min-w-0 gap-2"><Label>Type</Label><Select value={draftType} onValueChange={(value) => value && setDraftType(value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{requestTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2 md:col-span-3"><Label htmlFor="draft-description">Description *</Label><Textarea id="draft-description" rows={5} maxLength={10000} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} /></div>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Business case &amp; planning</CardTitle><p className="text-sm text-muted-foreground">Explain the business need and select the project and PIC.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="draft-justification">Business justification *</Label><Textarea id="draft-justification" className="min-h-28" maxLength={5000} value={draftJustification} onChange={(e) => setDraftJustification(e.target.value)} /></div>
                <div className="grid gap-4">
                  <div className="grid gap-2"><Label>Project *</Label><Select value={draftProjectName} onValueChange={(value) => value && setDraftProjectName(value)}><SelectTrigger className="w-full"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.NewId} value={project.Name}>{project.Name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label htmlFor="draft-target-date">Requested target date</Label><Input id="draft-target-date" type="date" value={draftTargetDate} onChange={(e) => setDraftTargetDate(e.target.value)} /></div>
                </div>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Attachments</CardTitle><p className="text-sm text-muted-foreground">Add or remove supporting files (up to 20 files, 5 MB each).</p></CardHeader><CardContent className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm transition-colors hover:bg-muted/40"><FileUp className="size-5 text-muted-foreground" /><span>Choose files</span><input type="file" multiple className="sr-only" onChange={(event) => { void addDraftAttachments(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                {request.attachments.filter((file) => keptAttachmentIds.includes(file.id)).map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 truncate">{file.name} <span className="text-muted-foreground">({formatSize(file.size)})</span></span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => setKeptAttachmentIds((current) => current.filter((attachmentId) => attachmentId !== file.id))}><Trash2 /></Button></div>)}
                {newAttachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 truncate">{file.name} <span className="text-muted-foreground">({formatSize(file.size)})</span></span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => setNewAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))}><Trash2 /></Button></div>)}
              </CardContent></Card>
              <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => void saveDraft(false)}><Save />{busy ? "Saving..." : request.status === "Returned" ? "Save changes" : "Save draft"}</Button><Button disabled={busy} onClick={() => void saveDraft(true)}><Send />{request.status === "Returned" ? "Resubmit request" : "Submit request"}</Button></div>
            </div> : <>
            <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
              <div className="flex flex-col gap-5">
                <Card className="flex-1 gap-0 overflow-hidden py-0"><CardHeader className="flex h-14 w-full shrink-0 flex-row items-center justify-between bg-muted/40 px-4 py-3"><CardTitle className="flex items-center gap-2 text-sm"><AlignLeft className="size-4 text-muted-foreground" />Description</CardTitle></CardHeader><CardContent className="p-4"><p className="whitespace-pre-wrap text-sm leading-6">{request.description || "No description provided."}</p></CardContent></Card>
                <Card className="flex-1 gap-0 overflow-hidden py-0"><CardHeader className="flex h-14 w-full shrink-0 flex-row items-center justify-between bg-muted/40 px-4 py-3"><CardTitle className="flex items-center gap-2 text-sm"><ChartNoAxesColumn className="size-4 text-muted-foreground" />Business Justification</CardTitle></CardHeader><CardContent className="p-4"><p className="whitespace-pre-wrap text-sm leading-6">{request.businessJustification || "No business justification provided."}</p></CardContent></Card>
              </div>
              <Card className="h-full gap-0 overflow-hidden py-0"><CardHeader className="flex h-14 w-full shrink-0 flex-row items-center justify-between bg-muted/40 px-4 py-3"><CardTitle className="flex items-center gap-2 text-sm"><Paperclip className="size-4 text-muted-foreground" />Attachments <span className="text-xs font-normal text-muted-foreground">({request.attachments.length} files)</span></CardTitle><label title={uploadingAttachments ? "Uploading..." : "Upload file"} className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:underline has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"><FileUp className="size-4" />Upload file<input type="file" multiple disabled={uploadingAttachments} className="sr-only" onChange={(event) => { void uploadRequestAttachments(event.currentTarget.files); event.currentTarget.value = ""; }} /></label></CardHeader><CardContent className="flex-1 space-y-2 p-4">{request.attachments.length ? request.attachments.map((file) => { const extension = file.name.split(".").pop()?.toUpperCase() || "FILE"; return <div key={file.id} className="flex min-w-0 items-center gap-3 rounded-lg border p-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-[9px] font-semibold text-muted-foreground">{extension.slice(0, 4)}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{file.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{formatSize(file.size)}</p></div><Button nativeButton={false} render={<a href={`/api/service-requests/${encodeURIComponent(id)}/attachments/${file.id}`} />} type="button" variant="ghost" size="icon-sm" aria-label={`Download ${file.name}`}><Download /></Button></div>; }) : <p className="py-8 text-center text-sm text-muted-foreground">No attachments yet.</p>}</CardContent></Card>
            </div>
            </>}
          </TabsContent>
          {request.status !== "Draft" ? <TabsContent value="review" className="space-y-5">
            <Card className="gap-0 overflow-hidden py-0"><CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 px-4 py-3"><CardTitle className="flex items-center gap-2 text-sm"><MessageSquare className="size-4 text-primary" />Review Notes &amp; Decision Logs<Badge variant="secondary" className="ml-1 text-[10px]">{reviewLogs.length} {reviewLogs.length === 1 ? "Note" : "Notes"}</Badge></CardTitle><span className="text-xs text-muted-foreground">Sorted by latest</span></CardHeader><CardContent className="p-0">{reviewLogs.length ? <Table className="min-w-[900px] xl:min-w-full"><TableHeader><TableRow><TableHead className="pl-5 sm:pl-6">Reviewer</TableHead><TableHead>Role</TableHead><TableHead>Decision</TableHead><TableHead>Date</TableHead><TableHead className="min-w-[360px]">Review note</TableHead></TableRow></TableHeader><TableBody>{reviewLogs.map((entry) => { const decision = entry.action.startsWith("Status changed to ") ? entry.action.slice("Status changed to ".length) : "Review note"; return <TableRow key={entry.id}><TableCell className="pl-5 sm:pl-6"><div className="flex items-center gap-2"><Avatar size="sm"><AvatarFallback>{initials(entry.actor)}</AvatarFallback></Avatar><span className="font-medium">{entry.actor}</span></div></TableCell><TableCell>{entry.actorRole ?? "—"}</TableCell><TableCell><DecisionBadge decision={decision} /></TableCell><TableCell>{formatDate(entry.createdAt)}</TableCell><TableCell className="min-w-[360px] max-w-[680px] whitespace-normal">{isStatusTransition(entry.detail) ? <ActivityDetail detail={entry.detail} /> : <div className="solution-content text-sm leading-6 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: sanitizeRichText(entry.detail || "Review decision recorded.") }} />}</TableCell></TableRow>; })}</TableBody></Table> : <p className="py-8 text-center text-sm text-muted-foreground">No review notes or decisions yet.</p>}</CardContent></Card>
            <Card className="gap-0 overflow-hidden py-0"><CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3"><div><CardTitle className="flex items-center gap-2 text-sm"><SquarePen className="size-4 text-muted-foreground" />Add Review Note &amp; Set Status</CardTitle><p className="mt-1 text-xs text-muted-foreground">Submit structured feedback and trigger workflow transition</p></div><Badge variant="secondary" className="shrink-0 text-[10px]">Markdown Supported</Badge></CardHeader><CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="mr-1 text-xs text-muted-foreground">Quick Templates:</span>{reviewTemplates.map((template) => <Button key={template} type="button" size="xs" variant="outline" onClick={() => setReviewComment((current) => current ? `${current}<p>${template}</p>` : `<p>${template}</p>`)}>+ {template}</Button>)}</div>
              <RichTextEditor value={reviewComment} onChange={setReviewComment} placeholder="Add review notes or explain what needs to be changed..." mentionOptions={users.map((user) => ({ value: String(user.Id), label: user.Name, description: user.Email }))} toolbarHint="Shift + Enter for new line" />
              <div className="flex flex-wrap items-center gap-2 border-t pt-4"><span className="mr-1 text-xs text-muted-foreground">Submit note with status:</span>{currentStatusOptions.filter((status) => status !== "On Hold" && status !== "Cancelled").map((status) => <Button key={status} size="sm" disabled={busy || (status === "Returned" && !plainText(reviewComment))} className={status === "Approved" ? "bg-emerald-600 text-white hover:bg-emerald-700" : status === "In Review" ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300" : status === "In Progress" ? "bg-indigo-600 text-white hover:bg-indigo-700" : undefined} variant={status === "Rejected" || status === "Returned" ? "destructive" : status === "In Review" ? "outline" : "default"} onClick={() => { if (status === "In Progress") { setProgressPicId(request.picId ? String(request.picId) : ""); setProgressPriority(request.priority); setPicDialogOpen(true); } else void changeStatus(status); }}>{status === "Returned" ? "Return to requester" : status}</Button>)}{secondaryStatusOptions.length ? <div className="ml-auto flex flex-wrap gap-2">{secondaryStatusOptions.map((status) => <Button key={status} size="sm" disabled={busy} variant={status === "Cancelled" ? "destructive" : "outline"} onClick={() => void changeStatus(status)}>{status}</Button>)}</div> : null}</div>
            </CardContent></Card>
          </TabsContent> : null}
          <TabsContent value="discussion" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><span className="font-medium text-foreground">{request.comments.length} Comments</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{participantCount} Participants</span><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{lastComment ? `Last message ${formatRelativeTime(lastComment.createdAt)}` : "No messages yet"}</span></div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Sort:</span><div className="flex rounded-md border bg-muted/40 p-0.5"><Button size="xs" variant={commentOrder === "oldest" ? "secondary" : "ghost"} onClick={() => setCommentOrder("oldest")}>Oldest first</Button><Button size="xs" variant={commentOrder === "newest" ? "secondary" : "ghost"} onClick={() => setCommentOrder("newest")}>Newest</Button></div></div>
            </div>
            {orderedRoots.length ? orderedRoots.map((comment) => <article key={comment.id} className="rounded-xl border bg-card p-4 sm:p-5"><div className="flex items-start gap-3"><Avatar size="sm"><AvatarFallback>{initials(comment.author)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold">{comment.author}</p><time className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</time></div><Button type="button" size="icon-sm" variant="ghost" aria-label="Reply" onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}><Reply /></Button></div><p className="whitespace-pre-wrap text-sm leading-6"><MentionText text={comment.body} users={users} /></p>{request.comments.filter((reply) => reply.parentCommentId === comment.id).map((reply) => <div key={reply.id} className="mt-4 flex gap-3 border-l-2 pl-3"><Avatar size="sm"><AvatarFallback>{initials(reply.author)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="mb-1 flex flex-wrap items-baseline justify-between gap-2"><p className="text-xs font-semibold">{reply.author}</p><time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time></div><p className="whitespace-pre-wrap text-sm leading-6"><MentionText text={reply.body} users={users} /></p></div></div>)}{replyTo === comment.id ? <div className="mt-4 space-y-3 border-t pt-3"><MentionTextarea autoFocus className="min-h-20" value={replyText} onChange={setReplyText} users={users} placeholder={`Reply to ${comment.author}...`} /><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setReplyTo(null)}>Cancel</Button><Button size="sm" disabled={busy || !replyText.trim()} onClick={() => void postComment(replyText, comment.id)}><Reply />Reply</Button></div></div> : null}</div></div></article>) : <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 size-5" />No discussion yet.</div>}
            <div className="rounded-xl border bg-card p-4 sm:p-5"><div className="mb-3 flex items-center gap-3 border-b pb-3"><Avatar size="sm"><AvatarFallback>{initials(currentUser?.name ?? "You")}</AvatarFallback></Avatar><div><p className="text-sm font-semibold">{currentUser?.name ?? "You"}</p><p className="text-xs text-muted-foreground">Add to the discussion</p></div><span className="ml-auto text-xs text-muted-foreground">Use @ to mention someone</span></div><MentionTextarea className="min-h-24 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" value={commentText} onChange={setCommentText} users={users} placeholder="Write a comment... type @ to mention collaborators" /><div className="mt-3 flex justify-end border-t pt-3"><Button size="sm" disabled={busy || !commentText.trim()} onClick={() => void postComment(commentText)}><Send />Post comment</Button></div></div>
          </TabsContent>
          <TabsContent value="activity" className="space-y-3">{request.activities.length ? <ol className="ml-2 border-l border-border">{request.activities.map((activity, index) => <li key={activity.id} className={`relative pl-6 ${index < request.activities.length - 1 ? "pb-6" : ""}`}><span className="absolute top-1 left-[-5px] size-2.5 rounded-full border-2 border-background bg-primary" /><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><p className="text-sm font-semibold">{activity.action}<span className="ml-2 font-normal text-muted-foreground">by {activity.actor}</span></p><time className="text-xs text-muted-foreground">{formatDate(activity.createdAt)}</time></div>{activity.detail ? <p className="mt-1 text-sm text-muted-foreground"><ActivityDetail detail={activity.detail} /></p> : null}</li>)}</ol> : <p className="py-8 text-center text-sm text-muted-foreground"><History className="mx-auto mb-2 size-5" />No activity yet.</p>}</TabsContent>
        </div>
      </Tabs>
      <Dialog open={picDialogOpen} onOpenChange={setPicDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign PIC</DialogTitle><DialogDescription>Choose the person responsible for this service request before moving it to In Progress.</DialogDescription></DialogHeader>
          <div className="grid gap-2"><Label htmlFor="progress-pic">PIC *</Label><SearchSelect id="progress-pic" options={users.map((user) => ({ value: String(user.Id), label: user.Name, description: user.Email }))} value={progressPicId || null} onValueChange={(value) => setProgressPicId(value ?? "")} placeholder="Search PIC by name or email" emptyText="No users found." disabled={!users.length} /></div>
          <div className="grid gap-2"><Label htmlFor="progress-priority">Priority *</Label><Select value={progressPriority} onValueChange={(value) => value && setProgressPriority(value)}><SelectTrigger id="progress-priority" className="w-full"><SelectValue placeholder="Select priority" /></SelectTrigger><SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setPicDialogOpen(false)}>Cancel</Button><Button disabled={busy || !progressPicId || !progressPriority} onClick={() => void confirmInProgress()}>{busy ? "Saving..." : "Assign and continue"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </AppShell>;
}
