import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { addIssueActivity } from "@/repositories/issue-activity.repository";

export const dynamic = "force-dynamic";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getIssue(id: string) {
  if (!GUID.test(id) && !/^BUG-\d+$/i.test(id)) return null;
  const rows = await query<{ Id: number }>(
    `SELECT "Id" FROM "DATA_Issues" WHERE "IsActive" = true AND ("NewId"::text = $1 OR ('BUG-' || lpad("Id"::text, 3, '0')) = $1)`,
    [id]
  );
  return rows[0] ?? null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const { id, commentId: rawCommentId } = await params;
    const commentId = Number(rawCommentId);
    const body = (await req.json().catch(() => null)) as { body?: string } | null;
    const comment = body?.body?.trim();
    if (!Number.isInteger(commentId) || commentId < 1) return fail("Comment not found", 404);
    if (!comment) return fail("Comment cannot be empty", 400);
    if (comment.length > 5000) return fail("Comment must be 5000 characters or fewer", 400);
    const issue = await getIssue(id);
    if (!issue) return fail("Issue not found", 404);
    const session = await getSession();
    const rows = await query(
      `UPDATE "DATA_IssueComments" SET "Body" = $3, "UpdatedBy" = $4, "UpdatedDate" = now()
       WHERE "Id" = $1 AND "IssueId" = $2 AND "IsActive" = true RETURNING "Id"`,
      [commentId, issue.Id, comment, session?.email ?? "System"]
    );
    if (!rows[0]) return fail("Comment not found", 404);
    await addIssueActivity(issue.Id, session?.name ?? "System", "Comment edited", "Updated a discussion comment.");
    return ok({ id: commentId, body: comment });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  try {
    const { id, commentId: rawCommentId } = await params;
    const commentId = Number(rawCommentId);
    if (!Number.isInteger(commentId) || commentId < 1) return fail("Comment not found", 404);
    const issue = await getIssue(id);
    if (!issue) return fail("Issue not found", 404);
    const session = await getSession();
    const rows = await query(
      `UPDATE "DATA_IssueComments" SET "IsActive" = false, "UpdatedBy" = $3, "UpdatedDate" = now()
       WHERE "Id" = $1 AND "IssueId" = $2 AND "IsActive" = true RETURNING "Id"`,
      [commentId, issue.Id, session?.email ?? "System"]
    );
    if (!rows[0]) return fail("Comment not found", 404);
    await addIssueActivity(issue.Id, session?.name ?? "System", "Comment deleted", "Removed a discussion comment.");
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
