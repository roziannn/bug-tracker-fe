import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { addIssueActivity } from "@/repositories/issue-activity.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const issues = await query<{
      id: string; newId: string; title: string; status: string; criticality: string;
      classification: string | null; pic: string | null; project: string | null; team: string | null;
      description: string; createdAt: string; resolvedAt: string | null;
    }>(
      `SELECT 'BUG-' || lpad(i."Id"::text, 3, '0') AS "id", i."NewId" AS "newId",
        i."Title" AS "title", i."Status" AS "status", i."Criticality" AS "criticality",
        c."Name" AS "classification", u."Name" AS "pic", p."Name" AS "project",
        issue_team."Name" AS "team",
        i."Description" AS "description", i."CreatedDate" AS "createdAt", closed_activity."CreatedDate" AS "resolvedAt"
       FROM "DATA_Issues" i
       LEFT JOIN "CORE_Category" c ON c."Id" = i."ClassificationId"
       LEFT JOIN "CORE_User" u ON u."Id" = i."PICId"
       LEFT JOIN "DATA_Projects" p ON p."Id" = i."ProjectId"
       LEFT JOIN LATERAL (
         SELECT domain."Name"
         FROM "CORE_TeamMember" member
         JOIN "CORE_Team" team ON team."Id" = member."TeamId" AND team."IsActive" = true
         JOIN "CORE_Category" domain ON domain."Id" = team."DomainId"
         WHERE member."UserId" = i."PICId" AND member."IsActive" = true
         ORDER BY member."Id"
         LIMIT 1
       ) issue_team ON true
       LEFT JOIN LATERAL (
         SELECT activity."CreatedDate"
         FROM "DATA_IssueActivity" activity
         WHERE activity."IssueId" = i."Id" AND activity."Action" = 'Issue closed'
         ORDER BY activity."CreatedDate" DESC
         LIMIT 1
       ) closed_activity ON true
       WHERE i."IsActive" = true
       ORDER BY i."CreatedDate" DESC, i."Id" DESC`
    );
    return ok(issues);
  } catch (err) {
    return handleError(err);
  }
}

type EvidenceInput = { name: string; size: number };
type IssueInput = {
  issueId?: string;
  title?: string;
  description?: string;
  classificationId?: number | null;
  criticality?: string;
  picId?: number | null;
  projectId?: string | null;
  evidence?: EvidenceInput[];
  status?: "Draft" | "Backlog" | "Ready" | "Investigating" | "In review" | "Done";
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CRITICALITIES = ["Tier 1 - Critical", "Tier 2 - Major", "Tier 3 - Moderate", "Tier 4 - Minor"];
const ISSUE_STATUSES = ["Draft", "Backlog", "Ready", "Investigating", "In review", "Done"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as IssueInput | null;
    if (!body || !ISSUE_STATUSES.includes(body.status ?? "")) return fail("Invalid issue status", 400);

    const status = body.status!;
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const evidence = Array.isArray(body.evidence) ? body.evidence.filter((file) => typeof file.name === "string" && Number.isFinite(file.size)) : [];
    if (status !== "Draft" && (!title || !description || !body.classificationId || !body.picId || !body.projectId || !evidence.length)) {
      return fail("Lengkapi semua field wajib dan evidence sebelum submit issue", 400);
    }
    if (title.length > 255) return fail("Title must be 255 characters or fewer", 400);
    if (!CRITICALITIES.includes(body.criticality ?? "Tier 2 - Major")) return fail("Invalid criticality tier", 400);

    const classificationId = Number.isInteger(body.classificationId) ? body.classificationId : null;
    const picId = Number.isInteger(body.picId) ? body.picId : null;
    let projectId: number | null = null;
    if (body.projectId) {
      if (!GUID.test(body.projectId)) return fail("Invalid project", 400);
      const project = await query<{ Id: number }>(`SELECT "Id" FROM "DATA_Projects" WHERE "NewId" = $1 AND "IsActive" = true`, [body.projectId]);
      if (!project[0]) return fail("Project not found", 400);
      projectId = project[0].Id;
    }
    if (picId !== null) {
      const user = await query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [picId]);
      if (!user[0]) return fail("PIC not found", 400);
    }
    if (classificationId !== null) {
      const category = await query(`SELECT 1 FROM "CORE_Category" WHERE "Id" = $1 AND "CategoryName" = 'Issue Classification' AND "IsActive" = true`, [classificationId]);
      if (!category[0]) return fail("Issue classification not found", 400);
    }

    const session = await getSession();
    const createdBy = session?.email ?? "System";
    const actor = session?.name ?? "System";
    if (body.issueId) {
      if (!GUID.test(body.issueId)) return fail("Invalid draft", 400);
      const previous = await query<{ Id: number; Status: string }>(`SELECT "Id", "Status" FROM "DATA_Issues" WHERE "NewId" = $1 AND "IsActive" = true`, [body.issueId]);
      if (!previous[0]) return fail("Issue not found", 404);
      const updated = await query<{ Id: number; NewId: string; Status: string }>(
        `UPDATE "DATA_Issues" SET "Title" = $2, "Description" = $3, "Status" = $4,
          "ClassificationId" = $5, "Criticality" = $6, "PICId" = $7, "ProjectId" = $8,
          "Evidence" = $9::jsonb, "UpdatedBy" = $10, "UpdatedDate" = now()
         WHERE "NewId" = $1 AND "IsActive" = true RETURNING "Id", "NewId", "Status"`,
        [body.issueId, title, description, status, classificationId, body.criticality ?? "Tier 2 - Major", picId, projectId, JSON.stringify(evidence), createdBy]
      );
      if (updated[0]) {
        const action = previous[0].Status === "Draft" && status !== "Draft" ? "Issue submitted" : status === "Draft" ? "Draft saved" : "Issue updated";
        await addIssueActivity(updated[0].Id, actor, action, title || "Issue details updated");
      }
      return updated[0] ? ok(updated[0]) : fail("Draft not found", 404);
    }

    const created = await query<{ Id: number; NewId: string; Status: string }>(
      `INSERT INTO "DATA_Issues" ("Title", "Description", "Status", "ClassificationId", "Criticality", "PICId", "ProjectId", "Evidence", "CreatedBy", "CreatedDate")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now()) RETURNING "Id", "NewId", "Status"`,
      [title, description, status, classificationId, body.criticality ?? "Tier 2 - Major", picId, projectId, JSON.stringify(evidence), createdBy]
    );
    await addIssueActivity(created[0].Id, actor, status === "Draft" ? "Draft created" : "Issue submitted", title || "Issue created");
    return ok(created[0], 201);
  } catch (err) {
    return handleError(err);
  }
}
