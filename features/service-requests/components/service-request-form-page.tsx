"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FileUp, Save, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appToast } from "@/lib/app-toast";
import type { Project } from "@/types";

type AttachmentDraft = { name: string; size: number; mimeType: string; id: string; contentBase64: string };
const requestTypes = ["New Feature", "Enhancement", "Data/Report Request", "Lainnya"];
const priorities = ["Low", "Medium", "High", "Critical"];

function sizeLabel(size: number) { return size >= 1048576 ? `${(size / 1048576).toFixed(1)} MB` : size >= 1024 ? `${Math.round(size / 1024)} KB` : `${size} B`; }
function readBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function ServiceRequestFormPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("New Feature");
  const [priority, setPriority] = useState("Medium");
  const [projectId, setProjectId] = useState("");
  const [justification, setJustification] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/projects", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<Project[]> : Promise.reject(new Error("Unable to load projects")))
      .then((items) => { if (active) setProjects(items); })
      .catch(() => {
        if (active) appToast.error({ title: "Failed to load projects", description: "Project options are unavailable right now." });
      });
    return () => { active = false; };
  }, []);

  async function addAttachments(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    let totalSize = attachments.reduce((total, file) => total + file.size, 0);
    const accepted = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024 || totalSize + file.size > 15 * 1024 * 1024) return false;
      totalSize += file.size;
      return true;
    });
    if (accepted.length < files.length) appToast.error({ title: "Some files were skipped", description: "Each attachment must be 5 MB or smaller and all attachments together must be under 15 MB." });
    try {
      const next = await Promise.all(accepted.map(async (file) => ({ id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`, name: file.name, size: file.size, mimeType: file.type, contentBase64: await readBase64(file) })));
      setAttachments((current) => [...current, ...next].slice(0, 20));
    } catch (error) { appToast.error({ title: "Unable to read attachment", description: error instanceof Error ? error.message : undefined }); }
  }

  async function submit(status: "Draft" | "Submitted") {
    if (status === "Submitted" && (!title.trim() || !description.trim() || !justification.trim() || !projectId)) {
      appToast.error({ title: "Complete required fields", description: "Title, description, business justification, and project are required to submit." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/service-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, title, description, type, priority, projectId: projectId || null, businessJustification: justification, requestedTargetDate: targetDate || null, attachments: attachments.map(({ name, size, mimeType, contentBase64 }) => ({ name, size, mimeType, contentBase64 })) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Unable to create service request");
      appToast.success({ title: status === "Draft" ? "Draft saved" : "Request submitted", description: "Your service request was saved." });
      window.location.assign(`/service-requests/${result.id}`);
    } catch (error) { appToast.error({ title: "Unable to save request", description: error instanceof Error ? error.message : undefined }); }
    finally { setSaving(false); }
  }

  return <AppShell activeNav="service-requests" breadcrumbs={[{ label: "Service Requests", href: "/service-requests" }, { label: "New request" }]} eyebrow="Request intake" title="New Service Request" toolbar={<div><h2 className="text-lg font-semibold">New request</h2><p className="text-sm text-muted-foreground">Describe the business need and who should deliver it.</p></div>}>
    <form className="grid gap-6" onSubmit={(event) => { event.preventDefault(); void submit("Submitted"); }}>
      <Card><CardHeader><CardTitle>Request details</CardTitle><CardDescription>Summarize what is needed and select its type and priority.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <div className="grid min-w-0 gap-2"><Label htmlFor="sr-title">Title *</Label><Input id="sr-title" maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need?" /></div>
        <div className="grid min-w-0 gap-2"><Label>Type</Label><Select value={type} onValueChange={(v) => v && setType(v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{requestTypes.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid min-w-0 gap-2"><Label>Priority</Label><Select value={priority} onValueChange={(v) => v && setPriority(v)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{priorities.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2 md:col-span-3"><Label htmlFor="sr-description">Description *</Label><Textarea id="sr-description" rows={5} maxLength={10000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the requested change, data, or outcome." /></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Business case & planning</CardTitle><CardDescription>Explain why it is needed and when you hope to receive it.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="sr-justification">Business justification *</Label><Textarea id="sr-justification" className="h-full min-h-28" maxLength={5000} value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Why is this needed? What benefit or impact will it have?" /></div>
        <div className="grid grid-rows-2 gap-4">
          <div className="grid content-start gap-2"><Label>Project *</Label><Select value={projectId} onValueChange={(v) => v && setProjectId(v)}><SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent>{projects.map((p) => <SelectItem key={p.NewId} value={p.NewId}>{p.Name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid content-start gap-2"><Label htmlFor="sr-target">Requested target date</Label><Input id="sr-target" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></div>
        </div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Attachments</CardTitle><CardDescription>Add mockups or supporting documents (up to 20 files).</CardDescription></CardHeader><CardContent className="space-y-3">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm hover:bg-muted/40"><FileUp className="size-5 text-muted-foreground" /><span>Choose files (5 MB each, 15 MB total)</span><input type="file" multiple className="sr-only" onChange={(e) => { void addAttachments(e.currentTarget.files); e.currentTarget.value = ""; }} /></label>
        {attachments.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="min-w-0 truncate">{file.name} <span className="text-muted-foreground">({sizeLabel(file.size)})</span></span><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}><Trash2 /></Button></div>)}
      </CardContent></Card>
      <div className="flex flex-wrap justify-between gap-3"><Button nativeButton={false} render={<Link href="/service-requests" />} variant="outline"><ArrowLeft />Cancel</Button><div className="flex gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => void submit("Draft")}><Save />Save as draft</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Submit request"}</Button></div></div>
    </form>
  </AppShell>;
}
