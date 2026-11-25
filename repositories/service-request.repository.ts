import { getPool, query } from "@/lib/db";

export const SERVICE_REQUEST_STATUSES = ["Draft", "Submitted", "In Review", "Approved", "In Progress", "Done", "Rejected", "Returned", "On Hold", "Cancelled"] as const;
export const SERVICE_REQUEST_TYPES = ["New Feature", "Enhancement", "Data/Report Request", "Lainnya"] as const;
export const SERVICE_REQUEST_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

function hasText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim().length > 0;
}

export type ServiceRequestInput = {
  title: string;
  description: string;
  type: typeof SERVICE_REQUEST_TYPES[number];
  priority: typeof SERVICE_REQUEST_PRIORITIES[number];
  projectId: string | null;
  picId: number | null;
  businessJustification: string;
  requestedTargetDate: string | null;
  estimatedEffort: string;
  status: "Draft" | "Submitted";
  attachments: { name: string; size: number; mimeType?: string; contentBase64?: string }[];
};

export async function updateServiceRequestDraft(id: string, requesterId: number, input: ServiceRequestInput, keptAttachmentIds: number[], submit: boolean, actor: string, updatedBy: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ Id: number; Status: string; RequesterId: number | null }>(
      `SELECT "Id", "Status", "RequesterId" FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true FOR UPDATE`, [id]
    );
    if (!current.rowCount) { await client.query("ROLLBACK"); return "not-found" as const; }
    if (!(current.rows[0].Status === "Draft" || current.rows[0].Status === "Returned") || current.rows[0].RequesterId !== requesterId) { await client.query("ROLLBACK"); return "not-editable" as const; }
    const project = input.projectId ? await client.query<{ Id: number }>(`SELECT "Id" FROM "DATA_Projects" WHERE "NewId" = $1 AND "IsActive" = true`, [input.projectId]) : null;
    if (input.projectId && !project?.rowCount) { await client.query("ROLLBACK"); return "project-not-found" as const; }
    if (input.picId) {
      const pic = await client.query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [input.picId]);
      if (!pic.rowCount) { await client.query("ROLLBACK"); return "pic-not-found" as const; }
    }
    if (submit && (!input.title.trim() || !hasText(input.description) || !hasText(input.businessJustification) || !input.projectId)) {
      await client.query("ROLLBACK"); return "missing-fields" as const;
    }
    const updated = await client.query(
      `UPDATE "DATA_ServiceRequests" SET "Title" = $2, "Description" = $3, "Type" = $4, "Priority" = $5, "ProjectId" = $6,
        "PICId" = $7, "BusinessJustification" = $8, "RequestedTargetDate" = $9, "Status" = $10, "UpdatedBy" = $11, "UpdatedDate" = now()
       WHERE "Id" = $1 RETURNING "Id"`,
      [current.rows[0].Id, input.title.trim(), input.description.trim(), input.type, input.priority, project?.rows[0]?.Id ?? null,
        input.picId, input.businessJustification.trim(), input.requestedTargetDate, submit ? "Submitted" : current.rows[0].Status, updatedBy]
    );
    await client.query(`UPDATE "DATA_ServiceRequestAttachments" SET "IsActive" = false, "UpdatedBy" = $3, "UpdatedDate" = now() WHERE "ServiceRequestId" = $1 AND "IsActive" = true AND NOT ("Id" = ANY($2::int[]))`, [updated.rows[0].Id, keptAttachmentIds, updatedBy]);
    for (const attachment of input.attachments) {
      await client.query(`INSERT INTO "DATA_ServiceRequestAttachments" ("ServiceRequestId", "Name", "Size", "MimeType", "Content", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, $6, now())`, [updated.rows[0].Id, attachment.name, attachment.size, attachment.mimeType ?? "", attachment.contentBase64 ? Buffer.from(attachment.contentBase64, "base64") : null, updatedBy]);
    }
    const action = submit ? "Request submitted" : current.rows[0].Status === "Returned" ? "Returned request updated" : "Draft updated";
    await client.query(`INSERT INTO "DATA_ServiceRequestActivities" ("ServiceRequestId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, now())`, [updated.rows[0].Id, actor, action, input.title.trim() || "Service request updated", updatedBy]);
    await client.query("COMMIT");
    return "ok" as const;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function listServiceRequests(filters: { status?: string; priority?: string; projectId?: string }) {
  return query(
    `SELECT sr."NewId" AS "id", sr."RequestNumber" AS "number", sr."Title" AS "title", sr."Type" AS "type",
      sr."Priority" AS "priority", sr."Status" AS "status", sr."RequestedTargetDate"::text AS "requestedTargetDate",
      p."NewId" AS "projectId", p."Name" AS "project", requester."Name" AS "requester", pic."Name" AS "pic", sr."CreatedDate" AS "createdAt"
     FROM "DATA_ServiceRequests" sr
     LEFT JOIN "DATA_Projects" p ON p."Id" = sr."ProjectId"
     LEFT JOIN "CORE_User" requester ON requester."Id" = sr."RequesterId"
     LEFT JOIN "CORE_User" pic ON pic."Id" = sr."PICId"
     WHERE sr."IsActive" = true
       AND ($1::text IS NULL OR sr."Status" = $1)
       AND ($2::text IS NULL OR sr."Priority" = $2)
       AND ($3::uuid IS NULL OR p."NewId" = $3::uuid)
     ORDER BY sr."CreatedDate" DESC, sr."Id" DESC`,
    [filters.status || null, filters.priority || null, filters.projectId || null]
  );
}

export async function getServiceRequest(id: string) {
  const rows = await query(
    `SELECT sr."Id" AS "internalId", sr."NewId" AS "id", sr."RequestNumber" AS "number", sr."Title" AS "title",
      sr."Description" AS "description", sr."Type" AS "type", sr."Priority" AS "priority", sr."Status" AS "status",
      sr."ProjectId" AS "projectInternalId", p."NewId" AS "projectId", p."Name" AS "project",
      sr."RequesterId" AS "requesterId", requester."Name" AS "requester", sr."PICId" AS "picId", pic."Name" AS "pic",
      sr."BusinessJustification" AS "businessJustification", sr."RequestedTargetDate"::text AS "requestedTargetDate",
      sr."EstimatedEffort" AS "estimatedEffort", sr."ReviewComment" AS "reviewComment",
      sr."CreatedBy" AS "createdBy", sr."CreatedDate" AS "createdAt", sr."UpdatedBy" AS "updatedBy", sr."UpdatedDate" AS "updatedAt"
     FROM "DATA_ServiceRequests" sr
     LEFT JOIN "DATA_Projects" p ON p."Id" = sr."ProjectId"
     LEFT JOIN "CORE_User" requester ON requester."Id" = sr."RequesterId"
     LEFT JOIN "CORE_User" pic ON pic."Id" = sr."PICId"
     WHERE sr."NewId" = $1 AND sr."IsActive" = true`, [id]
  );
  const request = rows[0];
  if (!request) return null;
  const [attachments, comments, activities, issues] = await Promise.all([
    query(`SELECT "Id" AS "id", "Name" AS "name", "Size" AS "size", "MimeType" AS "mimeType" FROM "DATA_ServiceRequestAttachments" WHERE "ServiceRequestId" = $1 AND "IsActive" = true ORDER BY "Id"`, [request.internalId]),
    query(`SELECT "Id" AS "id", "ParentCommentId" AS "parentCommentId", "Author" AS "author", "Body" AS "body", "CreatedDate" AS "createdAt" FROM "DATA_ServiceRequestComments" WHERE "ServiceRequestId" = $1 AND "IsActive" = true ORDER BY "CreatedDate", "Id"`, [request.internalId]),
    query(`SELECT a."Id" AS "id", a."Actor" AS "actor", a."Action" AS "action", a."Detail" AS "detail", a."CreatedDate" AS "createdAt", role."Name" AS "actorRole"
      FROM "DATA_ServiceRequestActivities" a
      LEFT JOIN LATERAL (
        SELECT r."Name" FROM "CORE_RoleClaim" rc JOIN "CORE_Role" r ON r."Id" = rc."RoleId"
        WHERE lower(rc."Email") = lower(a."CreatedBy") AND rc."IsActive" = true AND r."IsActive" = true
        ORDER BY rc."Id" LIMIT 1
      ) role ON true
      WHERE a."ServiceRequestId" = $1 ORDER BY a."CreatedDate" DESC, a."Id" DESC`, [request.internalId]),
    query(`SELECT i."NewId" AS "id", 'BUG-' || lpad(i."Id"::text, 3, '0') AS "number", i."Title" AS "title" FROM "DATA_ServiceRequestIssues" sri JOIN "DATA_Issues" i ON i."Id" = sri."IssueId" WHERE sri."ServiceRequestId" = $1 AND sri."IsActive" = true ORDER BY i."Id"`, [request.internalId]),
  ]);
  return { ...request, attachments, comments, activities, issues };
}

export async function createServiceRequest(input: ServiceRequestInput, requesterId: number, actor: string, createdBy: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const project = input.projectId ? await client.query<{ Id: number }>(`SELECT "Id" FROM "DATA_Projects" WHERE "NewId" = $1 AND "IsActive" = true`, [input.projectId]) : null;
    if (input.projectId && !project?.rowCount) {
      await client.query("ROLLBACK");
      return { error: "Project not found" as const };
    }
    if (input.picId) {
      const pic = await client.query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [input.picId]);
      if (!pic.rowCount) { await client.query("ROLLBACK"); return { error: "PIC not found" as const }; }
    }
    const inserted = await client.query<{ Id: number; NewId: string }>(
      `INSERT INTO "DATA_ServiceRequests" ("RequestNumber", "Title", "Description", "Type", "Priority", "ProjectId", "RequesterId", "PICId", "BusinessJustification", "RequestedTargetDate", "EstimatedEffort", "Status", "CreatedBy", "CreatedDate")
       VALUES ('TMP-' || left(gen_random_uuid()::text, 15), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now()) RETURNING "Id", "NewId"`,
      [input.title, input.description, input.type, input.priority, project?.rows[0]?.Id ?? null, requesterId, input.picId, input.businessJustification, input.requestedTargetDate, input.estimatedEffort, input.status, createdBy]
    );
    const { Id: requestId, NewId } = inserted.rows[0];
    await client.query(`UPDATE "DATA_ServiceRequests" SET "RequestNumber" = 'SR-' || lpad("Id"::text, greatest(3, length("Id"::text)), '0') WHERE "Id" = $1`, [requestId]);
    for (const attachment of input.attachments) {
      await client.query(`INSERT INTO "DATA_ServiceRequestAttachments" ("ServiceRequestId", "Name", "Size", "MimeType", "Content", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, $6, now())`, [requestId, attachment.name, attachment.size, attachment.mimeType ?? "", attachment.contentBase64 ? Buffer.from(attachment.contentBase64, "base64") : null, createdBy]);
    }
    await client.query(`INSERT INTO "DATA_ServiceRequestActivities" ("ServiceRequestId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, now())`, [requestId, actor, input.status === "Draft" ? "Draft created" : "Request submitted", input.title || "Service request created", createdBy]);
    await client.query("COMMIT");
    return { id: NewId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function getServiceRequestAttachment(id: string, attachmentId: number) {
  const rows = await query<{ Name: string; Size: number; MimeType: string; Content: Buffer | null }>(
    `SELECT a."Name", a."Size", a."MimeType", a."Content" FROM "DATA_ServiceRequestAttachments" a
     JOIN "DATA_ServiceRequests" sr ON sr."Id" = a."ServiceRequestId"
     WHERE sr."NewId" = $1 AND a."Id" = $2 AND sr."IsActive" = true AND a."IsActive" = true`, [id, attachmentId]
  );
  return rows[0] ?? null;
}

export async function addServiceRequestAttachments(id: string, attachments: { name: string; size: number; mimeType?: string; contentBase64?: string }[], actor: string, updatedBy: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const request = await client.query<{ Id: number }>(`SELECT "Id" FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true FOR UPDATE`, [id]);
    if (!request.rowCount) { await client.query("ROLLBACK"); return "not-found" as const; }
    const totals = await client.query<{ Count: number; Size: number }>(`SELECT COUNT(*)::int AS "Count", COALESCE(SUM("Size"), 0)::int AS "Size" FROM "DATA_ServiceRequestAttachments" WHERE "ServiceRequestId" = $1 AND "IsActive" = true`, [request.rows[0].Id]);
    if (totals.rows[0].Count + attachments.length > 20 || totals.rows[0].Size + attachments.reduce((sum, file) => sum + file.size, 0) > 15 * 1024 * 1024) {
      await client.query("ROLLBACK"); return "attachment-limits" as const;
    }
    for (const file of attachments) {
      await client.query(`INSERT INTO "DATA_ServiceRequestAttachments" ("ServiceRequestId", "Name", "Size", "MimeType", "Content", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, $6, now())`, [request.rows[0].Id, file.name, file.size, file.mimeType ?? "", file.contentBase64 ? Buffer.from(file.contentBase64, "base64") : null, updatedBy]);
    }
    await client.query(`INSERT INTO "DATA_ServiceRequestActivities" ("ServiceRequestId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate") VALUES ($1, $2, 'Attachments uploaded', $3, $4, now())`, [request.rows[0].Id, actor, `${attachments.length} file${attachments.length === 1 ? "" : "s"} uploaded`, updatedBy]);
    await client.query("COMMIT");
    return "ok" as const;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function updateServiceRequestStatus(id: string, status: string, reviewComment: string, actor: string, updatedBy: string, picId: number | null = null, priority: string | null = null) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{ Id: number; Status: string; Title: string; Description: string; BusinessJustification: string; ProjectId: number | null; PICId: number | null }>(`SELECT "Id", "Status", "Title", "Description", "BusinessJustification", "ProjectId", "PICId" FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true FOR UPDATE`, [id]);
    if (!current.rowCount) { await client.query("ROLLBACK"); return "not-found" as const; }
    const oldStatus = current.rows[0].Status;
    if (status === "In Progress") {
      const pic = picId ? await client.query(`SELECT 1 FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [picId]) : null;
      if (!pic?.rowCount) { await client.query("ROLLBACK"); return "pic-not-found" as const; }
    }
    if (status === "Submitted" && (!current.rows[0].Title.trim() || !hasText(current.rows[0].Description) || !hasText(current.rows[0].BusinessJustification) || !current.rows[0].ProjectId)) {
      await client.query("ROLLBACK");
      return "missing-fields" as const;
    }
    const allowed: Record<string, string[]> = {
      Draft: ["Submitted", "Cancelled"], Submitted: ["In Review", "Cancelled"], "In Review": ["Approved", "Rejected", "Returned", "On Hold"],
      Approved: ["In Progress", "On Hold", "Cancelled"], "In Progress": ["Done", "On Hold", "Cancelled"], "On Hold": ["In Review", "Approved", "In Progress", "Cancelled"],
      Rejected: [], Returned: [], Done: [], Cancelled: [],
    };
    if (status !== oldStatus && !allowed[oldStatus]?.includes(status)) { await client.query("ROLLBACK"); return "invalid-transition" as const; }
    await client.query(`UPDATE "DATA_ServiceRequests" SET "Status" = $2, "ReviewComment" = CASE WHEN $3 <> '' THEN $3 ELSE "ReviewComment" END, "PICId" = COALESCE($5, "PICId"), "Priority" = COALESCE($6, "Priority"), "UpdatedBy" = $4, "UpdatedDate" = now() WHERE "Id" = $1`, [current.rows[0].Id, status, reviewComment, updatedBy, picId, priority]);
    if (status !== oldStatus || reviewComment) await client.query(`INSERT INTO "DATA_ServiceRequestActivities" ("ServiceRequestId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, now())`, [current.rows[0].Id, actor, status !== oldStatus ? `Status changed to ${status}` : "Review updated", reviewComment || `${oldStatus} → ${status}`, updatedBy]);
    await client.query("COMMIT");
    return "ok" as const;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function addServiceRequestComment(id: string, parentCommentId: number | null, body: string, authorId: number, author: string, createdBy: string) {
  const request = await query<{ Id: number }>(`SELECT "Id" FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true`, [id]);
  if (!request[0]) return "not-found" as const;
  if (parentCommentId) {
    const parent = await query(`SELECT 1 FROM "DATA_ServiceRequestComments" WHERE "Id" = $1 AND "ServiceRequestId" = $2 AND "ParentCommentId" IS NULL`, [parentCommentId, request[0].Id]);
    if (!parent[0]) return "invalid-parent" as const;
  }
  await query(`INSERT INTO "DATA_ServiceRequestComments" ("ServiceRequestId", "ParentCommentId", "AuthorId", "Author", "Body", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, $4, $5, $6, now())`, [request[0].Id, parentCommentId, authorId, author, body, createdBy]);
  await query(`INSERT INTO "DATA_ServiceRequestActivities" ("ServiceRequestId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate") VALUES ($1, $2, 'Comment added', $3, $4, now())`, [request[0].Id, author, body.slice(0, 250), createdBy]);
  return "ok" as const;
}

export async function linkServiceRequestIssue(id: string, issueNewId: string, actor: string, createdBy: string) {
  const request = await query<{ Id: number; RequestNumber: string }>(`SELECT "Id", "RequestNumber" FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true`, [id]);
  const issue = await query<{ Id: number; Title: string }>(`SELECT "Id", "Title" FROM "DATA_Issues" WHERE "NewId" = $1 AND "IsActive" = true`, [issueNewId]);
  if (!request[0] || !issue[0]) return "not-found" as const;
  const existing = await query(`SELECT 1 FROM "DATA_ServiceRequestIssues" WHERE "ServiceRequestId" = $1 AND "IssueId" = $2`, [request[0].Id, issue[0].Id]);
  if (existing[0]) return "exists" as const;
  await query(`INSERT INTO "DATA_ServiceRequestIssues" ("ServiceRequestId", "IssueId", "CreatedBy", "CreatedDate") VALUES ($1, $2, $3, now())`, [request[0].Id, issue[0].Id, createdBy]);
  await query(`INSERT INTO "DATA_ServiceRequestActivities" ("ServiceRequestId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate") VALUES ($1, $2, 'Issue linked', $3, $4, now())`, [request[0].Id, actor, `${issue[0].Title} linked to ${request[0].RequestNumber}`, createdBy]);
  return "ok" as const;
}
