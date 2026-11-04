import { query } from "@/lib/db";
import type { AuditTrailEntry } from "@/features/bug-tracker/data/bug-tracker-data";

export type AuditOutcome = "Success" | "Warning" | "Blocked";

export async function getAuditTrailEvents(): Promise<AuditTrailEntry[]> {
  const rows = await query<Omit<AuditTrailEntry, "id"> & { id: number }>(
    `SELECT a."Id" AS id, a."Actor" AS actor, a."Action" AS action,
      a."TargetType" AS "targetType", a."TargetName" AS "targetName",
      CASE
        WHEN a."TargetType" = 'DATA_Issues' AND issue."Id" IS NOT NULL
          THEN a."Action" || ' issue Bug Id BUG-' || lpad(issue."Id"::text, 3, '0')
        WHEN a."TargetType" = 'DATA_IssueActivity' AND activity."Id" IS NOT NULL AND activity_issue."Id" IS NOT NULL
          THEN activity."Action" || ' Bug Id BUG-' || lpad(activity_issue."Id"::text, 3, '0')
        WHEN a."TargetType" = 'Authentication'
          THEN a."Action" || ': ' || a."Detail"
        ELSE a."Action" || ' ' || lower(replace(replace(a."TargetType", 'DATA_', ''), 'CORE_', '')) || ' ' || a."TargetName"
      END AS detail,
      a."Outcome" AS outcome, a."CreatedDate" AS "createdAt", '' AS team,
      '' AS "actorRole"
     FROM "DATA_AuditTrail" a
     LEFT JOIN "DATA_Issues" issue
       ON a."TargetType" = 'DATA_Issues'
       AND (issue."Id"::text = a."TargetName" OR issue."Title" = a."TargetName")
     LEFT JOIN "DATA_IssueActivity" activity
       ON a."TargetType" = 'DATA_IssueActivity' AND activity."Id"::text = a."TargetName"
     LEFT JOIN "DATA_Issues" activity_issue ON activity_issue."Id" = activity."IssueId"
     ORDER BY a."CreatedDate" DESC, a."Id" DESC`
  );

  return rows.map((row) => ({ ...row, id: String(row.id) }));
}

export async function addAuditTrailEvent(input: {
  actor: string;
  action: string;
  targetType: string;
  targetName: string;
  detail: string;
  outcome?: AuditOutcome;
}) {
  await query(
    `INSERT INTO "DATA_AuditTrail" ("Actor", "Action", "TargetType", "TargetName", "Detail", "Outcome", "CreatedDate")
     VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [input.actor, input.action, input.targetType, input.targetName, input.detail, input.outcome ?? "Success"]
  );
}
