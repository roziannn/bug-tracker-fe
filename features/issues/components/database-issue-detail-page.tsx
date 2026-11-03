"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, CheckCircle2, FileText, History, Lightbulb, MessageSquare, Pencil, Reply, RotateCcw, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CredentialConfirmDialog } from "@/components/shared/credential-confirm-dialog";
import { appToast } from "@/lib/app-toast";
import { formatDate } from "@/lib/date";
import { requestJson } from "@/lib/request";
import type { Paged, User } from "@/types";

type IssueDetail = {
  id: string;
  newId: string;
  title: string;
  status: string;
  criticality: string;
  classification: string | null;
  pic: string | null;
  project: string | null;
  description: string;
  evidence: { name: string; size: number }[];
  createdAt: string;
  createdBy: string | null;
  solution: string;
  comments: { id: number; parentCommentId: number | null; author: string; body: string; createdAt: string }[];
  activity: { id: number; actor: string; action: string; detail: string; createdAt: string }[];
};

function MentionText({ text, users }: { text: string; users: User[] }) {
  const names = users.map((user) => user.Name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const pattern = new RegExp(`(^|\\s)(@(?:${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=[\\s.,!?;:]|$))`, "gu");
  const content: ReactNode[] = [];
  let offset = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > offset) content.push(text.slice(offset, match.index));
    if (match[1]) content.push(match[1]);
    content.push(<span key={`${match.index}-${match[2]}`} className="inline-flex rounded-md bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">{match[2]}</span>);
    offset = pattern.lastIndex;
  }
  if (!content.length) return <>{text}</>;
  content.push(text.slice(offset));
  return <>{content}</>;
}

function MentionTextarea({ value, onChange, users, placeholder, className, autoFocus, maxLength = 5000 }: {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
  const [mention, setMention] = useState<{ start: number; end: number; query: string } | null>(null);
  const suggestions = mention ? users.filter((user) => user.Name.toLowerCase().includes(mention.query.toLowerCase()) || user.Email.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 6) : [];
  const mentionNames = useMemo(() => users.map((user) => user.Name).filter(Boolean).sort((a, b) => b.length - a.length), [users]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || input.innerText.replace(/\r/g, "") === value) return;
    const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const pattern = mentionNames.length ? new RegExp(`(^|\\s)(@(?:${mentionNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=\\s|$))`, "gu") : null;
    const marked = pattern ? escaped.replace(pattern, '$1<span data-mention="true" class="inline-flex rounded-md bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">$2</span>') : escaped;
    input.innerHTML = marked.replace(/\n/g, "<br>");
  }, [value, mentionNames]);

  function textBeforeCaret(input: HTMLDivElement) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !input.contains(selection.anchorNode)) return { text: input.innerText, caret: input.innerText.length };
    const range = document.createRange();
    range.selectNodeContents(input);
    range.setEnd(selection.anchorNode!, selection.anchorOffset);
    const before = range.toString();
    return { text: input.innerText.replace(/\r/g, ""), caret: before.length };
  }

  function updateMention(text: string, caret: number) {
    const prefix = text.slice(0, caret);
    const match = prefix.match(/(^|\s)@([\p{L}\p{N} .'-]*)$/u);
    setMention(match ? { start: caret - match[2].length - 1, end: caret, query: match[2].trim() } : null);
  }

  function selectUser(user: User) {
    if (!mention) return;
    const { text } = inputRef.current ? textBeforeCaret(inputRef.current) : { text: value };
    const next = `${text.slice(0, mention.start)}@${user.Name} ${text.slice(mention.end)}`;
    onChange(next);
    setMention(null);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const caret = mention.start + user.Name.length + 2;
      input.focus();
      const walker = document.createTreeWalker(input, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      let remaining = caret;
      while (node && remaining > (node.textContent?.length ?? 0)) {
        remaining -= node.textContent?.length ?? 0;
        node = walker.nextNode();
      }
      if (node) {
        const range = document.createRange();
        range.setStart(node, Math.min(remaining, node.textContent?.length ?? 0));
        range.collapse(true);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    });
  }

  return <div className="relative"><div ref={inputRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={placeholder ?? "Comment"} data-placeholder={placeholder} autoFocus={autoFocus} className={`${className ?? ""} min-h-20 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm whitespace-pre-wrap break-words outline-none focus-visible:ring-3 focus-visible:ring-ring/50 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground`} onInput={(event) => { const input = event.currentTarget; const rawText = input.innerText.replace(/\r/g, ""); const text = rawText.slice(0, maxLength); onChange(text); const { caret } = textBeforeCaret(input); updateMention(text, caret); }} onClick={(event) => { const { text, caret } = textBeforeCaret(event.currentTarget); updateMention(text, caret); }} onKeyUp={(event) => { const { text, caret } = textBeforeCaret(event.currentTarget); updateMention(text, caret); }} onBlur={() => window.setTimeout(() => setMention(null), 150)} />{mention && suggestions.length ? <div className="absolute bottom-full left-0 z-30 mb-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">{suggestions.map((user) => <button type="button" key={user.Id} className="flex w-full cursor-pointer flex-col rounded-md px-3 py-2 text-left hover:bg-muted" onMouseDown={(event) => event.preventDefault()} onClick={() => selectUser(user)}><span className="text-sm font-medium">{user.Name}</span><span className="text-xs text-muted-foreground">{user.Email}</span></button>)}</div> : null}</div>;
}

function fileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

export function DatabaseIssueDetailPage({ id }: { id: string }) {
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [solution, setSolution] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [busyCommentId, setBusyCommentId] = useState<number | null>(null);
  const [replyingCommentId, setReplyingCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [savingSolution, setSavingSolution] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  useEffect(() => {
    requestJson<Paged<User>>("/api/users?pageSize=100").then((result) => setUsers(result.data.filter((user) => user.IsActive))).catch(() => setUsers([]));
    requestJson<IssueDetail>(`/api/issues/${encodeURIComponent(id)}`)
      .then((data) => { setIssue(data); setSolution(data.solution); })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Something went wrong, please try again.";
        setLoadError(message);
        appToast.error({ title: "Failed to load issue", description: message });
      })
      .finally(() => setLoaded(true));
  }, [id]);

  async function postComment() {
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const comment = await requestJson<IssueDetail["comments"][number]>(`/api/issues/${encodeURIComponent(id)}`, "POST", { body: commentText });
      setIssue((current) => current ? { ...current, comments: [...current.comments, comment] } : current);
      setCommentText("");
    } catch (err) {
      appToast.error({ title: "Failed to add comment", description: err instanceof Error ? err.message : undefined });
    } finally { setPostingComment(false); }
  }

  async function saveCommentEdit(commentId: number) {
    if (!editingCommentText.trim() || busyCommentId !== null) return;
    setBusyCommentId(commentId);
    try {
      await requestJson(`/api/issues/${encodeURIComponent(id)}/comments/${commentId}`, "PUT", { body: editingCommentText });
      const latest = await requestJson<IssueDetail>(`/api/issues/${encodeURIComponent(id)}`);
      setIssue(latest);
      setEditingCommentId(null);
      setEditingCommentText("");
      appToast.success({ title: "Comment updated" });
    } catch (err) {
      appToast.error({ title: "Failed to update comment", description: err instanceof Error ? err.message : undefined });
    } finally { setBusyCommentId(null); }
  }

  async function deleteComment(commentId: number) {
    if (busyCommentId !== null || !window.confirm("Delete this comment?")) return;
    setBusyCommentId(commentId);
    try {
      await requestJson(`/api/issues/${encodeURIComponent(id)}/comments/${commentId}`, "DELETE");
      const latest = await requestJson<IssueDetail>(`/api/issues/${encodeURIComponent(id)}`);
      setIssue(latest);
      if (editingCommentId === commentId) { setEditingCommentId(null); setEditingCommentText(""); }
      appToast.success({ title: "Comment deleted" });
    } catch (err) {
      appToast.error({ title: "Failed to delete comment", description: err instanceof Error ? err.message : undefined });
    } finally { setBusyCommentId(null); }
  }

  async function postReply(parentCommentId: number) {
    if (!replyText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      await requestJson<IssueDetail["comments"][number]>(`/api/issues/${encodeURIComponent(id)}`, "POST", { body: replyText, parentCommentId });
      const latest = await requestJson<IssueDetail>(`/api/issues/${encodeURIComponent(id)}`);
      setIssue(latest);
      setReplyingCommentId(null);
      setReplyText("");
      appToast.success({ title: "Reply posted" });
    } catch (err) {
      appToast.error({ title: "Failed to post reply", description: err instanceof Error ? err.message : undefined });
    } finally { setPostingComment(false); }
  }

  async function saveSolution() {
    if (savingSolution) return;
    setSavingSolution(true);
    try {
      const result = await requestJson<{ Solution: string }>(`/api/issues/${encodeURIComponent(id)}`, "PATCH", { solution });
      setSolution(result.Solution);
      setIssue((current) => current ? { ...current, solution: result.Solution } : current);
      appToast.success({ title: "Solution saved" });
    } catch (err) {
      appToast.error({ title: "Failed to save solution", description: err instanceof Error ? err.message : undefined });
    } finally { setSavingSolution(false); }
  }

  async function toggleClosed() {
    if (!issue || changingStatus) return;
    const status = issue.status === "Done" ? "Backlog" : "Done";
    setChangingStatus(true);
    try {
      await requestJson(`/api/issues/${encodeURIComponent(id)}`, "PATCH", { status });
      setIssue({ ...issue, status });
      appToast.success({ title: status === "Done" ? "Issue closed" : "Issue re-opened" });
    } catch (err) {
      appToast.error({ title: "Failed to update issue status", description: err instanceof Error ? err.message : undefined });
    } finally { setChangingStatus(false); }
  }

  return (
    <AppShell
      activeNav="issues"
      breadcrumbs={[{ label: "All Issues", href: "/issues" }, { label: issue?.id ?? "Issue detail" }]}
      eyebrow="Issue detail"
      title={issue?.id ?? "Issue detail"}
      toolbar={<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold tracking-tight">Issue details</h2><p className="text-sm text-muted-foreground">Issue report, assignment, and evidence.</p></div><div className="flex flex-wrap items-center gap-2">{issue && issue.status !== "Draft" ? <Button onClick={() => issue.status === "Done" ? toggleClosed() : setConfirmCloseOpen(true)} disabled={changingStatus} variant={issue.status === "Done" ? "outline" : "default"}>{issue.status === "Done" ? <RotateCcw /> : <CheckCircle2 />}{changingStatus ? "Updating..." : issue.status === "Done" ? "Re-open issue" : "Close issue"}</Button> : null}<Button nativeButton={false} render={<Link href="/issues" />} variant="outline"><ArrowLeft /> Back to issues</Button></div></div>}
    >
      {!loaded ? <Card><CardContent className="py-10 text-center text-muted-foreground">Loading issue...</CardContent></Card> : null}
      {loaded && !issue ? <Card><CardHeader><CardTitle>{loadError ? "Failed to load issue" : "Issue not found"}</CardTitle><CardDescription>{loadError ?? "Issue dengan ID tersebut tidak ditemukan."}</CardDescription></CardHeader></Card> : null}
      {issue ? <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Badge variant={issue.status === "Draft" ? "outline" : "secondary"}>{issue.status}</Badge><Badge variant="outline">{issue.criticality}</Badge></div>
            <CardTitle className="text-2xl">{issue.title || "Untitled draft"}</CardTitle>
            <CardDescription>Created {formatDate(issue.createdAt)}{issue.createdBy ? ` by ${issue.createdBy}` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-2"><h3 className="text-sm font-semibold">Description</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{issue.description || "No description provided."}</p></section>
            <section className="grid gap-4 border-t pt-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Issue classification</p><p className="font-medium">{issue.classification || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">PIC</p><p className="font-medium">{issue.pic || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Project</p><p className="font-medium">{issue.project || "—"}</p></div>
            </section>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Evidence</CardTitle><CardDescription>{issue.evidence.length} attached file{issue.evidence.length === 1 ? "" : "s"}</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {issue.evidence.length ? issue.evidence.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-lg border p-3"><FileText className="size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{fileSize(file.size)}</p></div></div>) : <p className="text-sm text-muted-foreground">No evidence attached.</p>}
          </CardContent>
        </Card>
        </div>
        <Card>
          <Tabs defaultValue="discussion" className="gap-0">
            <CardHeader className="gap-4 border-b pb-0">
              <TabsList variant="line" className="h-11 w-full justify-start gap-6 rounded-none border-0 bg-transparent p-0">
                <TabsTrigger value="discussion" className="h-full flex-none cursor-pointer justify-start gap-2 rounded-none px-1 text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary after:bg-primary after:opacity-0 data-active:after:opacity-100"><MessageSquare />Discussion<span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px]">{issue.comments.length}</span></TabsTrigger>
                <TabsTrigger value="solution" className="h-full flex-none cursor-pointer justify-start gap-2 rounded-none px-1 text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary after:bg-primary after:opacity-0 data-active:after:opacity-100"><Lightbulb />Solution</TabsTrigger>
                <TabsTrigger value="activity" className="h-full flex-none cursor-pointer justify-start gap-2 rounded-none px-1 text-muted-foreground hover:text-foreground data-active:bg-transparent data-active:text-primary after:bg-primary after:opacity-0 data-active:after:opacity-100"><History />Activity</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-5">
              <TabsContent value="discussion" className="space-y-4">
                <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
                  <MentionTextarea className="min-h-24 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" value={commentText} onChange={setCommentText} users={users} placeholder="Share an update or ask a question..." />
                  <div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">Comments are visible to the issue team.</span><Button size="sm" onClick={postComment} disabled={!commentText.trim() || postingComment}>{postingComment ? "Posting..." : "Post comment"}</Button></div>
                </div>
                {issue.comments.filter((comment) => !comment.parentCommentId).length ? <div className="space-y-3">{issue.comments.filter((comment) => !comment.parentCommentId).map((comment) => <article key={comment.id} className="rounded-xl border px-4 py-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{comment.author}</p><div className="flex items-center gap-2"><time className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</time>{editingCommentId !== comment.id ? <><Button type="button" size="icon-sm" variant="ghost" aria-label="Reply to comment" title="Reply" disabled={busyCommentId !== null} onClick={() => { setReplyingCommentId(replyingCommentId === comment.id ? null : comment.id); setReplyText(""); }}><Reply /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Edit comment" title="Edit comment" disabled={busyCommentId !== null} onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.body); }}><Pencil /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Delete comment" title="Delete comment" disabled={busyCommentId !== null} onClick={() => deleteComment(comment.id)}><Trash2 className="text-destructive" /></Button></> : null}</div></div>{editingCommentId === comment.id ? <div className="space-y-2"><MentionTextarea autoFocus className="min-h-20 resize-y" value={editingCommentText} onChange={setEditingCommentText} users={users} /> <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={busyCommentId === comment.id} onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }}><X />Cancel</Button><Button type="button" size="sm" disabled={!editingCommentText.trim() || busyCommentId === comment.id} onClick={() => saveCommentEdit(comment.id)}>{busyCommentId === comment.id ? "Saving..." : <><Check />Save</>}</Button></div></div> : <p className="whitespace-pre-wrap text-sm leading-6"><MentionText text={comment.body} users={users} /></p>}{issue.comments.filter((reply) => reply.parentCommentId === comment.id).map((reply) => <div key={reply.id} className="ml-5 mt-3 rounded-lg border-l-2 bg-muted/30 px-3 py-2"><div className="mb-1 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{reply.author}</p><div className="flex items-center gap-2"><time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time><Button type="button" size="icon-sm" variant="ghost" aria-label="Edit reply" title="Edit reply" disabled={busyCommentId !== null} onClick={() => { setEditingCommentId(reply.id); setEditingCommentText(reply.body); }}><Pencil /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Delete reply" title="Delete reply" disabled={busyCommentId !== null} onClick={() => deleteComment(reply.id)}><Trash2 className="text-destructive" /></Button></div></div>{editingCommentId === reply.id ? <div className="space-y-2"><MentionTextarea autoFocus className="min-h-20 resize-y" value={editingCommentText} onChange={setEditingCommentText} users={users} /><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={busyCommentId === reply.id} onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }}><X />Cancel</Button><Button type="button" size="sm" disabled={!editingCommentText.trim() || busyCommentId === reply.id} onClick={() => saveCommentEdit(reply.id)}>{busyCommentId === reply.id ? "Saving..." : <><Check />Save</>}</Button></div></div> : <p className="whitespace-pre-wrap text-sm leading-6"><MentionText text={reply.body} users={users} /></p>}</div>)}{replyingCommentId === comment.id ? <div className="ml-5 mt-3 space-y-2 border-l-2 pl-3"><MentionTextarea autoFocus className="min-h-20 resize-y" value={replyText} onChange={setReplyText} users={users} placeholder={`Reply to ${comment.author}...`} /><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" disabled={postingComment} onClick={() => { setReplyingCommentId(null); setReplyText(""); }}>Cancel</Button><Button type="button" size="sm" disabled={!replyText.trim() || postingComment} onClick={() => postReply(comment.id)}>{postingComment ? "Posting..." : <><Reply />Post reply</>}</Button></div></div> : null}</article>)}</div> : <div className="rounded-xl border border-dashed px-4 py-8 text-center"><MessageSquare className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">No discussion yet</p><p className="mt-1 text-xs text-muted-foreground">Be the first to share an update.</p></div>}
              </TabsContent>
              <TabsContent value="activity" className="space-y-3">
                {issue.activity.length ? issue.activity.map((event) => <article key={event.id} className="flex gap-3 rounded-xl border px-4 py-3"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><p className="text-sm font-semibold">{event.action}<span className="ml-2 font-normal text-muted-foreground">by {event.actor}</span></p><time className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</time></div>{event.detail ? <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p> : null}</div></article>) : <div className="rounded-xl border border-dashed px-4 py-8 text-center"><History className="mx-auto mb-2 size-5 text-muted-foreground" /><p className="text-sm font-medium">No activity yet</p></div>}
              </TabsContent>
              <TabsContent value="solution" className="space-y-4">
                <div className="rounded-xl border bg-muted/20 p-3 sm:p-4"><Textarea className="min-h-36 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0" value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Describe the resolution, workaround, or proposed fix..." rows={5} maxLength={10000} /><div className="mt-3 flex items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">{solution.length}/10000 characters</span><Button size="sm" onClick={saveSolution} disabled={savingSolution}>{savingSolution ? "Saving..." : "Save solution"}</Button></div></div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div> : null}
      <CredentialConfirmDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen} actionLabel="Close issue" onVerified={toggleClosed} />
    </AppShell>
  );
}
