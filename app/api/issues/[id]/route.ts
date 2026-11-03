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
      createdBy: string | null; solution: string;
    }>(
      `SELECT 'BUG-' || lpad(i."Id"::text, 3, '0') AS "id", i."NewId" AS "newId",
        i."Title" AS "title", i."Status" AS "status", i."Criticality" AS "criticality",
        c."Name" AS "classification", i."ClassificationId" AS "classificationId",
        u."Name" AS "pic", i."PICId" AS "picId", p."Name" AS "project", p."NewId" AS "projectId",
        i."Description" AS "description", i."Evidence" AS "evidence",
        i."CreatedDate" AS "createdAt", i."CreatedBy" AS "createdBy", i."Solution" AS "solution"
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
    const body = (await req.json().catch(() => null)) as { solution?: string; status?: string } | null;
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
    if (typeof body?.solution !== "string") return fail("Solution is required", 400);
    if (body.solution.length > 10000) return fail("Solution must be 10000 characters or fewer", 400);
    const session = await getSession();
    const rows = await query<{ Id: number; NewId: string; Solution: string }>(
      `UPDATE "DATA_Issues" SET "Solution" = $2, "UpdatedBy" = $3, "UpdatedDate" = now()
       WHERE "IsActive" = true AND ("NewId"::text = $1 OR ('BUG-' || lpad("Id"::text, 3, '0')) = $1)
       RETURNING "Id", "NewId", "Solution"`,
      [id, body.solution.trim(), session?.email ?? "System"]
    );
    if (rows[0]) await addIssueActivity(rows[0].Id, session?.name ?? "System", "Solution updated", body.solution.trim() ? "Updated the issue solution." : "Cleared the issue solution.");
    return rows[0] ? ok(rows[0]) : fail("Issue not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
