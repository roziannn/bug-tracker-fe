import { query } from "@/lib/db";

export async function addIssueActivity(issueId: number, actor: string, action: string, detail = "") {
  await query(
    `INSERT INTO "DATA_IssueActivity" ("IssueId", "Actor", "Action", "Detail", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, $3, $4, $2, now())`,
    [issueId, actor, action, detail]
  );
}
