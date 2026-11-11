import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { addIssueActivity } from "@/repositories/issue-activity.repository";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await query<{
      id: string; newId: string; title: string; status: string; criticality: string;
      classification: string | null; classificationId: number | null; pic: string | null; picId: number | null; project: string | null; projectId: string | null;
      description: string; evidence: { name: string; size: number }[]; createdAt: string;
      createdBy: string | null; solution: string; rootCause: string;
      hasRepairCost: boolean; repairCost: string | null; repairCostDetail: string; repairMethod: string | null;
      additionalInfoSaved: boolean;
    }>(
      `SELECT 'BUG-' || lpad(i."Id"::text, 3, '0') AS "id", i."NewId" AS "newId",
        i."Title" AS "title", i."Status" AS "status", i."Criticality" AS "criticality",
        c."Name" AS "classification", i."ClassificationId" AS "classificationId",
        u."Name" AS "pic", i."PICId" AS "picId", p."Name" AS "project", p."NewId" AS "projectId",
        i."Description" AS "description", i."Evidence" AS "evidence",
        i."CreatedDate" AS "createdAt", i."CreatedBy" AS "createdBy", i."Solution" AS "solution", i."RootCause" AS "rootCause",
        i."HasRepairCost" AS "hasRepairCost", i."RepairCost" AS "repairCost", i."RepairCostDetail" AS "repairCostDetail", i."RepairMethod" AS "repairMethod", i."AdditionalInfoSaved" AS "additionalInfoSaved"
       FROM "DATA_Issues" i
       LEFT JOIN "CORE_Category" c ON c."Id" = i."ClassificationId"
       LEFT JOIN "CORE_User" u ON u."Id" = i."PICId"
       LEFT JOIN "DATA_Projects" p ON p."Id" = i."ProjectId"
       WHERE i."IsActive" = true AND (i."NewId"::text = $1 OR ('BUG-' || lpad(i."Id"::text, 3, '0')) = $1)
       LIMIT 1`,
      [id]
    );
    if (!rows[0]) return fail("Issue not found", 404);
    const comments = await query<{ id: number; parentCommentId: number | null; author: string; body: string; createdAt: string }>(
      `SELECT "Id" AS "id", "ParentCommentId" AS "parentCommentId", "Author" AS "author", "Body" AS "body", "CreatedDate" AS "createdAt"
       FROM "DATA_IssueComments" WHERE "IssueId" = (SELECT "Id" FROM "DATA_Issues" WHERE "NewId" = $1)
         AND "IsActive" = true ORDER BY "CreatedDate", "Id"`,
      [rows[0].newId]
    );
    const activity = await query<{ id: number; actor: string; action: string; detail: string; createdAt: string }>(
      `SELECT "Id" AS "id", "Actor" AS "actor", "Action" AS "action", "Detail" AS "detail", "CreatedDate" AS "createdAt"
       FROM "DATA_IssueActivity" WHERE "IssueId" = (SELECT "Id" FROM "DATA_Issues" WHERE "NewId" = $1)
         AND "IsActive" = true ORDER BY "CreatedDate" DESC, "Id" DESC`,
      [rows[0].newId]
    );
    return ok({ ...rows[0], comments, activity });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { body?: string; parentCommentId?: number | null } | null;
    const comment = body?.body?.trim();
    if (!comment) return fail("Comment cannot be empty", 400);
    if (comment.length > 5000) return fail("Comment must be 5000 characters or fewer", 400);
    const issue = await query<{ Id: number }>(`SELECT "Id" FROM "DATA_Issues" WHERE "IsActive" = true AND ("NewId"::text = $1 OR ('BUG-' || lpad("Id"::text, 3, '0')) = $1)`, [id]);
    if (!issue[0]) return fail("Issue not found", 404);
    const parentCommentId = body?.parentCommentId ?? null;
    if (parentCommentId !== null) {
      if (!Number.isInteger(parentCommentId) || parentCommentId < 1) return fail("Parent comment not found", 404);
      const parent = await query<{ Id: number }>(`SELECT "Id" FROM "DATA_IssueComments" WHERE "Id" = $1 AND "IssueId" = $2 AND "IsActive" = true AND "ParentCommentId" IS NULL`, [parentCommentId, issue[0].Id]);
      if (!parent[0]) return fail("Parent comment not found", 404);
    }
    const session = await getSession();
    const author = session?.name ?? "User";
    const rows = await query<{ id: number; author: string; body: string; createdAt: string }>(
      `INSERT INTO "DATA_IssueComments" ("IssueId", "ParentCommentId", "Author", "Body", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, now()) RETURNING "Id" AS "id", "ParentCommentId" AS "parentCommentId", "Author" AS "author", "Body" AS "body", "CreatedDate" AS "createdAt"`,
      [issue[0].Id, parentCommentId, author, comment, session?.email ?? "System"]
    );
    await addIssueActivity(issue[0].Id, author, parentCommentId ? "Comment reply added" : "Comment added", parentCommentId ? `Replied to comment #${parentCommentId}.` : "Added a comment to the discussion.");
    return ok(rows[0], 201);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as {
      solution?: string; rootCause?: string; status?: string;
      additionalInfo?: { hasRepairCost?: boolean; repairCost?: number | null; repairCostDetail?: string; repairMethod?: string | null };
    } | null;
    if (body?.status !== undefined) {
      if (body.status !== "Done" && body.status !== "Backlog") return fail("Status must be Done or Backlog", 400);
      const session = await getSession();
      const updated = await query<{ Id: number; Status: string }>(
        `UPDATE "DATA_Issues" SET "Status" = $2, "UpdatedBy" = $3, "UpdatedDate" = now()
         WHERE "IsActive" = true AND ("NewId"::text = $1 OR ('BUG-' || lpad("Id"::text, 3, '0')) = $1)
         RETURNING "Id", "Status"`,
        [id, body.status, session?.email ?? "System"]
      );
      if (updated[0]) await addIssueActivity(updated[0].Id, session?.name ?? "System", body.status === "Done" ? "Issue closed" : "Issue re-opened");
      return updated[0] ? ok(updated[0]) : fail("Issue not found", 404);
    }
    if (body?.additionalInfo !== undefined) {
      const info = body.additionalInfo;
      if (!info || typeof info !== "object" || typeof info.hasRepairCost !== "boolean") return fail("Repair cost selection is required", 400);
      if (info.hasRepairCost && (typeof info.repairCost !== "number" || !Number.isFinite(info.repairCost) || info.repairCost < 0 || info.repairCost > 9999999999.99)) return fail("Enter a valid repair cost", 400);
      if (info.repairCostDetail !== undefined && typeof info.repairCostDetail !== "string") return fail("Repair cost detail must be text", 400);
      if ((info.repairCostDetail?.length ?? 0) > 5000) return fail("Repair cost detail must be 5000 characters or fewer", 400);
      if (info.repairMethod !== null && info.repairMethod !== undefined && info.repairMethod !== "Vendor" && info.repairMethod !== "Self Service") return fail("Repair method is invalid", 400);
      const session = await getSession();
      const rows = await query<{ Id: number }>(
        `UPDATE "DATA_Issues" SET "HasRepairCost" = $2, "RepairCost" = $3, "RepairCostDetail" = $4, "RepairMethod" = $5, "AdditionalInfoSaved" = true, "UpdatedBy" = $6, "UpdatedDate" = now()
         WHERE "IsActive" = true AND ("NewId"::text = $1 OR ('BUG-' || lpad("Id"::text, 3, '0')) = $1)
         RETURNING "Id"`,
        [id, info.hasRepairCost, info.hasRepairCost ? info.repairCost : null, info.hasRepairCost ? (info.repairCostDetail ?? "").trim() : "", info.repairMethod ?? null, session?.email ?? "System"]
      );
      if (rows[0]) await addIssueActivity(rows[0].Id, session?.name ?? "System", "Additional info updated", "Updated repair cost information.");
      return rows[0] ? ok({ hasRepairCost: info.hasRepairCost, repairCost: info.hasRepairCost ? info.repairCost : null, repairCostDetail: info.hasRepairCost ? (info.repairCostDetail ?? "").trim() : "", repairMethod: info.repairMethod ?? null, additionalInfoSaved: true }) : fail("Issue not found", 404);
    }
    const field = typeof body?.solution === "string" ? "Solution" : typeof body?.rootCause === "string" ? "RootCause" : null;
    const content = field === "Solution" ? body?.solution : body?.rootCause;
    if (!field || typeof content !== "string") return fail("Solution or root cause is required", 400);
    if (content.length > 2 * 1024 * 1024) return fail("Content is too large", 400);
    const session = await getSession();
    const rows = await query<{ Id: number; NewId: string; Solution?: string; RootCause?: string }>(
      `UPDATE "DATA_Issues" SET "${field}" = $2, "UpdatedBy" = $3, "UpdatedDate" = now()
       WHERE "IsActive" = true AND ("NewId"::text = $1 OR ('BUG-' || lpad("Id"::text, 3, '0')) = $1)
       RETURNING "Id", "NewId", "${field}"`,
      [id, content.trim(), session?.email ?? "System"]
    );
    if (rows[0]) {
      const value = content.trim();
      const label = field === "Solution" ? "solution" : "root cause";
      await addIssueActivity(rows[0].Id, session?.name ?? "System", `${field === "Solution" ? "Solution" : "Root cause"} updated`, value ? `Updated the issue ${label}.` : `Cleared the issue ${label}.`);
      return ok({ ...rows[0], [field]: value });
    }
    return fail("Issue not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
