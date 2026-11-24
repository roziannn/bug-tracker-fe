"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, ClipboardList, Download, FileText, FileUp, History, MessageSquare, Paperclip, Reply, Save, Send, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MentionText, MentionTextarea } from "@/features/issues/components/database-issue-detail-page";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import type { Project, User } from "@/types";

type RequestDetail = {
  id: string; number: string; title: string; description: string; type: string; priority: string; status: string;
  projectId: string | null; project: string | null; requesterId: number | null; requester: string | null; picId: number | null; pic: string | null;
  businessJustification: string; requestedTargetDate: string | null; estimatedEffort: string; reviewComment: string;
  createdBy: string | null; createdAt: string; attachments: { id: number; name: string; size: number; mimeType: string }[];
  comments: { id: number; parentCommentId: number | null; author: string; body: string; createdAt: string }[];
  activities: { id: number; actor: string; action: string; detail: string; createdAt: string }[];
  issues: { id: string; number: string; title: string }[];
};
type IssueOption = { id: string; newId: string; title: string };
type NewAttachment = { name: string; size: number; mimeType: string; contentBase64: string };
const requestTypes = ["New Feature", "Enhancement", "Data/Report Request", "Lainnya"];
const priorities = ["Low", "Medium", "High", "Critical"];
const statusOptions: Record<string, string[]> = {
  Draft: ["Submitted", "Cancelled"], Submitted: ["In Review", "Cancelled"], "In Review": ["Approved", "Rejected", "Returned", "On Hold"],
  Approved: ["In Progress", "On Hold", "Cancelled"], "In Progress": ["Done", "On Hold", "Cancelled"], "On Hold": ["In Review", "Approved", "In Progress", "Cancelled"],
  Rejected: [], Returned: ["Submitted"], Done: [], Cancelled: [],
};

function formatSize(size: number) { return size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : size >= 1024 ? `${Math.round(size / 1024)} KB` : `${size} B`; }

export function ServiceRequestDetailPage({ id }: { id: string }) {
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftType, setDraftType] = useState("New Feature");
  const [draftPriority, setDraftPriority] = useState("Medium");
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftPicId, setDraftPicId] = useState("");
  const [draftJustification, setDraftJustification] = useState("");
  const [draftTargetDate, setDraftTargetDate] = useState("");
  const [keptAttachmentIds, setKeptAttachmentIds] = useState<number[]>([]);
  const [newAttachments, setNewAttachments] = useState<NewAttachment[]>([]);
  const [issueOptions, setIssueOptions] = useState<IssueOption[]>([]);
  const [issueToLink, setIssueToLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

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
      setDraftProjectId(item.projectId ?? "");
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
    fetch("/api/issues", { cache: "no-store" }).then((r) => r.ok ? r.json() : []).then(setIssueOptions).catch(() => setIssueOptions([]));
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

  async function saveDraft(submit: boolean) {
    if (!request) return;
    if (submit && (!draftTitle.trim() || !draftDescription.trim() || !draftJustification.trim() || !draftProjectId || !draftPicId)) {
      appToast.error({ title: "Complete required fields", description: "Title, description, business justification, project, and PIC are required to submit." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftAction: submit ? "submit" : "save", title: draftTitle, description: draftDescription,
          type: draftType, priority: draftPriority, projectId: draftProjectId || null,
          picId: draftPicId ? Number(draftPicId) : null, businessJustification: draftJustification,
          requestedTargetDate: draftTargetDate || null, keptAttachmentIds,
          attachments: newAttachments,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to save request");
      setNewAttachments([]);
      await load();
      appToast.success({ title: submit ? "Request submitted" : "Draft saved", description: submit ? "Your request is ready for review." : "Your draft changes were saved." });
    } catch (err) { appToast.error({ title: "Unable to save request", description: err instanceof Error ? err.message : undefined }); }
    finally { setBusy(false); }
  }

  async function changeStatus(status: string) {
    if (!request) return;
    if (status === "Returned" && !reviewComment.trim()) {
      appToast.error({ title: "Return reason required", description: "Add a reason before returning this request to the requester." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reviewComment }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to update status");
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

  async function linkIssue() {
    if (!issueToLink) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/service-requests/${encodeURIComponent(id)}/issues`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ issueId: issueToLink }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to link issue");
      setIssueToLink(""); await load(); appToast.success({ title: "Issue linked", description: "The issue is now connected to this service request." });
    } catch (err) { appToast.error({ title: "Unable to link issue", description: err instanceof Error ? err.message : undefined }); }
    finally { setBusy(false); }
  }

  if (loading) return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: "Loading" }]} eyebrow="Request detail" title="Service Request"><Skeleton className="h-96 w-full rounded-xl" /></AppShell>;
  if (!request) return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: "Not found" }]} eyebrow="Request detail" title="Service Request"><Card><CardHeader><CardTitle>{error || "Service request not found"}</CardTitle></CardHeader><CardContent><Button nativeButton={false} render={<Link href="/service-requests" />} variant="outline"><ArrowLeft />Back to requests</Button></CardContent></Card></AppShell>;

  const roots = request.comments.filter((comment) => !comment.parentCommentId);
  return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: request.number }]} eyebrow="Request detail" title={request.number} toolbar={<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">{request.title || "Untitled draft"}</h2><p className="text-sm text-muted-foreground">Created {formatDate(request.createdAt)}{request.requester ? ` by ${request.requester}` : ""}</p></div><Button nativeButton={false} render={<Link href="/service-requests" />} variant="outline"><ArrowLeft />Back to requests</Button></div>}>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1fr)]">
      <Card className="lg:col-span-2"><CardContent className="flex flex-wrap items-center gap-2 pt-4"><Badge variant="outline">{request.status}</Badge><Badge variant="secondary">{request.priority}</Badge><Badge variant="outline">{request.type}</Badge><span className="text-sm text-muted-foreground">{request.project ?? "No project"}</span></CardContent></Card>
      <Card className="gap-0 overflow-hidden py-0 lg:col-span-2"><Tabs defaultValue="overview" className="gap-0"><CardHeader className="gap-0 border-b bg-muted/20 px-4 py-4 sm:px-5"><div className="overflow-x-auto"><TabsList className="h-auto min-h-14 w-max min-w-full justify-start gap-1.5 rounded-xl border bg-muted/60 p-1.5"><TabsTrigger value="overview" className="h-12 flex-none cursor-pointer rounded-lg px-5 text-sm text-muted-foreground transition-colors hover:text-foreground data-active:bg-background data-active:text-primary data-active:shadow-sm after:hidden"><ClipboardList />Overview</TabsTrigger>{request.status !== "Draft" ? <TabsTrigger value="review" className="h-12 flex-none cursor-pointer rounded-lg px-5 text-sm text-muted-foreground transition-colors hover:text-foreground data-active:bg-background data-active:text-primary data-active:shadow-sm after:hidden"><Check />Review &amp; Approval</TabsTrigger> : null}<TabsTrigger value="discussion" className="h-12 flex-none cursor-pointer rounded-lg px-5 text-sm text-muted-foreground transition-colors hover:text-foreground data-active:bg-background data-active:text-primary data-active:shadow-sm after:hidden"><MessageSquare />Discussion <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[11px] text-muted-foreground">{request.comments.length}</span></TabsTrigger><TabsTrigger value="activity" className="h-12 flex-none cursor-pointer rounded-lg px-5 text-sm text-muted-foreground transition-colors hover:text-foreground data-active:bg-background data-active:text-primary data-active:shadow-sm after:hidden"><History />Activity</TabsTrigger></TabsList></div></CardHeader>
        <CardContent className="pt-5 pb-5">
          <TabsContent value="overview" className="space-y-5">
            {request.status === "Draft" ? <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm font-semibold">This request is still a draft</h3><p className="mt-1 text-sm text-muted-foreground">Edit the details below, then save or submit it for review.</p></div><Badge variant="outline">Draft</Badge></div>
              <Card><CardHeader><CardTitle>Request details</CardTitle><p className="text-sm text-muted-foreground">Update the request title, type, priority, and description.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
                <div className="grid min-w-0 gap-2"><Label htmlFor="draft-title">Title *</Label><Input id="draft-title" maxLength={255} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} /></div>
                <div className="grid min-w-0 gap-2"><Label>Type</Label><Select value={draftType} onValueChange={(value) => value && setDraftType(value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{requestTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid min-w-0 gap-2"><Label>Priority</Label><Select value={draftPriority} onValueChange={(value) => value && setDraftPriority(value)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{priorities.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2 md:col-span-3"><Label htmlFor="draft-description">Description *</Label><Textarea id="draft-description" rows={5} maxLength={10000} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} /></div>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Business case &amp; planning</CardTitle><p className="text-sm text-muted-foreground">Explain the business need and select the project and PIC.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="draft-justification">Business justification *</Label><Textarea id="draft-justification" className="min-h-28" maxLength={5000} value={draftJustification} onChange={(e) => setDraftJustification(e.target.value)} /></div>
                <div className="grid gap-4">
                  <div className="grid gap-2"><Label>Project *</Label><Select value={draftProjectId} onValueChange={(value) => value && setDraftProjectId(value)}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((project) => <SelectItem key={project.NewId} value={project.NewId}>{project.Name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label>PIC *</Label><Select value={draftPicId} onValueChange={(value) => value && setDraftPicId(value)}><SelectTrigger><SelectValue placeholder="Select PIC" /></SelectTrigger><SelectContent>{users.map((user) => <SelectItem key={user.Id} value={String(user.Id)}>{user.Name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid gap-2"><Label htmlFor="draft-target-date">Requested target date</Label><Input id="draft-target-date" type="date" value={draftTargetDate} onChange={(e) => setDraftTargetDate(e.target.value)} /></div>
                </div>
              </CardContent></Card>
              <Card><CardHeader><CardTitle>Attachments</CardTitle><p className="text-sm text-muted-foreground">Add or remove supporting files (up to 20 files, 5 MB each).</p></CardHeader><CardContent className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm transition-colors hover:bg-muted/40"><FileUp className="size-5 text-muted-foreground" /><span>Choose files</span><input type="file" multiple className="sr-only" onChange={(event) => { void addDraftAttachments(event.currentTarget.files); event.currentTarget.value = ""; }} /></label>
                {request.attachments.filter((file) => keptAttachmentIds.includes(file.id)).map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 truncate">{file.name} <span className="text-muted-foreground">({formatSize(file.size)})</span></span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => setKeptAttachmentIds((current) => current.filter((attachmentId) => attachmentId !== file.id))}><Trash2 /></Button></div>)}
                {newAttachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 truncate">{file.name} <span className="text-muted-foreground">({formatSize(file.size)})</span></span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => setNewAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))}><Trash2 /></Button></div>)}
              </CardContent></Card>
              <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => void saveDraft(false)}><Save />{busy ? "Saving..." : "Save draft"}</Button><Button disabled={busy} onClick={() => void saveDraft(true)}><Send />Submit request</Button></div>
            </div> : <>
            <section className="rounded-xl border bg-muted/20 p-4"><h3 className="mb-2 text-sm font-semibold">Description</h3><p className="whitespace-pre-wrap text-sm leading-6">{request.description || "No description provided."}</p></section>
            <section className="rounded-xl border bg-muted/20 p-4"><h3 className="mb-2 text-sm font-semibold">Business justification</h3><p className="whitespace-pre-wrap text-sm leading-6">{request.businessJustification || "No business justification provided."}</p></section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Requester", request.requester], ["PIC", request.pic], ["Requested target", request.requestedTargetDate], ["effort", request.estimatedEffort]].map(([label, value]) => <div key={label} className="rounded-lg border p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value || "—"}</p></div>)}</div>
            <section><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4" />Attachments</h3>{request.attachments.length ? <div className="grid gap-2 sm:grid-cols-2">{request.attachments.map((file) => <div key={file.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm"><FileText className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{file.name} <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span></span><Button nativeButton={false} render={<a href={`/api/service-requests/${encodeURIComponent(id)}/attachments/${file.id}`} />} type="button" variant="ghost" size="icon-sm" aria-label={`Download ${file.name}`}><Download /></Button></div>)}</div> : <p className="text-sm text-muted-foreground">No attachments.</p>}</section>
            <section className="space-y-2"><h3 className="text-sm font-semibold">Linked issues</h3>{request.issues.map((issue) => <Link key={issue.id} href={`/issues/${issue.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted/50"><span className="font-medium text-primary">{issue.number}</span> · {issue.title}</Link>)}<div className="flex flex-col gap-2 sm:flex-row"><select aria-label="Select issue to link" value={issueToLink} onChange={(e) => setIssueToLink(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"><option value="">Link an issue…</option>{issueOptions.filter((issue) => !request.issues.some((linked) => linked.id === issue.newId)).map((issue) => <option key={issue.newId} value={issue.newId}>{issue.id} · {issue.title}</option>)}</select><Button type="button" variant="outline" disabled={!issueToLink || busy} onClick={() => void linkIssue()}>Link issue</Button></div></section>
            </>}
          </TabsContent>
          {request.status !== "Draft" ? <TabsContent value="review" className="space-y-5">
            <div className="rounded-xl border p-4"><h3 className="text-sm font-semibold">Review notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{request.reviewComment || "No review notes yet."}</p></div>
            <div className="grid gap-2"><label htmlFor="review-comment" className="text-sm font-medium">{request.status === "In Review" ? "Review note / return reason" : "Add review note"}{request.status === "In Review" ? " *" : ""}</label><textarea id="review-comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} maxLength={5000} rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="Add review notes or explain what needs to be changed..." /></div>
            <div className="flex flex-wrap gap-2">{(statusOptions[request.status] ?? []).map((status) => <Button key={status} disabled={busy || (status === "Returned" && !reviewComment.trim())} variant={status === "Rejected" || status === "Returned" || status === "Cancelled" ? "destructive" : status === "On Hold" ? "outline" : "default"} onClick={() => void changeStatus(status)}>{status === "Returned" ? "Return to requester" : status}</Button>)}</div>
          </TabsContent> : null}
          <TabsContent value="discussion" className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-3 sm:p-4"><MentionTextarea className="min-h-24 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" value={commentText} onChange={setCommentText} users={users} placeholder="Write an update... type @ to mention someone" /><div className="mt-3 flex justify-end border-t pt-3"><Button size="sm" disabled={busy || !commentText.trim()} onClick={() => void postComment(commentText)}><Send />Post comment</Button></div></div>
            {roots.length ? roots.map((comment) => <article key={comment.id} className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{comment.author}</p><div className="flex items-center gap-2"><time className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</time><Button type="button" size="icon-sm" variant="ghost" aria-label="Reply" onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReplyText(""); }}><Reply /></Button></div></div><p className="whitespace-pre-wrap text-sm leading-6"><MentionText text={comment.body} users={users} /></p>{request.comments.filter((reply) => reply.parentCommentId === comment.id).map((reply) => <div key={reply.id} className="ml-5 mt-3 rounded-lg border-l-2 bg-muted/30 px-3 py-2"><div className="mb-1 flex justify-between gap-2"><p className="text-xs font-medium">{reply.author}</p><time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time></div><p className="whitespace-pre-wrap text-sm"><MentionText text={reply.body} users={users} /></p></div>)}{replyTo === comment.id ? <div className="ml-5 mt-3 space-y-2 border-l-2 pl-3"><MentionTextarea autoFocus className="min-h-20" value={replyText} onChange={setReplyText} users={users} placeholder={`Reply to ${comment.author}...`} /><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setReplyTo(null)}><X />Cancel</Button><Button size="sm" disabled={busy || !replyText.trim()} onClick={() => void postComment(replyText, comment.id)}><Reply />Reply</Button></div></div> : null}</article>) : <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 size-5" />No discussion yet.</div>}
          </TabsContent>
          <TabsContent value="activity" className="space-y-3">{request.activities.length ? <ol className="ml-2 border-l border-border">{request.activities.map((activity, index) => <li key={activity.id} className={`relative pl-6 ${index < request.activities.length - 1 ? "pb-6" : ""}`}><span className="absolute top-1 left-[-5px] size-2.5 rounded-full border-2 border-background bg-primary" /><div className="flex flex-col gap-1 sm:flex-row sm:justify-between"><p className="text-sm font-semibold">{activity.action}<span className="ml-2 font-normal text-muted-foreground">by {activity.actor}</span></p><time className="text-xs text-muted-foreground">{formatDate(activity.createdAt)}</time></div>{activity.detail ? <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p> : null}</li>)}</ol> : <p className="py-8 text-center text-sm text-muted-foreground"><History className="mx-auto mb-2 size-5" />No activity yet.</p>}</TabsContent>
        </CardContent>
      </Tabs></Card>
    </div>
  </AppShell>;
}
