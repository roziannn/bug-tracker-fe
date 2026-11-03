import { query } from "@/lib/db";

export type KanbanCard = {
  id: string;
  title: string;
  status: string;
  sequence: number;
  [key: string]: unknown;
};

type KanbanRow = { NewId: string; Title: string; Status: string; Sequence: number; Payload: Record<string, unknown> | null };

function mapCard(row: KanbanRow): KanbanCard {
  return { ...(row.Payload ?? {}), id: row.NewId, title: row.Title, status: row.Status, sequence: row.Sequence };
}

export async function listKanbanCards() {
  const rows = await query<KanbanRow>(
    `SELECT "NewId", "Title", "Status", "Sequence", "Payload" FROM "DATA_Kanban"
     WHERE "IsActive" = true ORDER BY "Status", "Sequence", "Id"`
  );
  return rows.map(mapCard);
}

export async function createKanbanCard(input: { title: string; status: string; payload: Record<string, unknown>; actor: string }) {
  const rows = await query<KanbanRow>(
    `INSERT INTO "DATA_Kanban" ("Title", "Status", "Sequence", "Payload", "CreatedBy", "CreatedDate")
     VALUES ($1, $2, COALESCE((SELECT MAX("Sequence") + 1 FROM "DATA_Kanban" WHERE "Status" = $3 AND "IsActive" = true), 0), $4::jsonb, $5, now())
     RETURNING "NewId", "Title", "Status", "Sequence", "Payload"`,
    [input.title, input.status, input.status, JSON.stringify(input.payload), input.actor]
  );
  return mapCard(rows[0]);
}

export async function updateKanbanCard(id: string, input: { title: string; status: string; sequence: number; payload: Record<string, unknown>; actor: string }) {
  const rows = await query<KanbanRow>(
    `UPDATE "DATA_Kanban" SET "Title" = $2, "Status" = $3, "Sequence" = $4, "Payload" = $5::jsonb, "UpdatedBy" = $6, "UpdatedDate" = now()
     WHERE "NewId" = $1 AND "IsActive" = true RETURNING "NewId", "Title", "Status", "Sequence", "Payload"`,
    [id, input.title, input.status, input.sequence, JSON.stringify(input.payload), input.actor]
  );
  return rows[0] ? mapCard(rows[0]) : null;
}

export async function deleteKanbanCard(id: string, actor: string) {
  const rows = await query<{ NewId: string }>(
    `UPDATE "DATA_Kanban" SET "IsActive" = false, "UpdatedBy" = $2, "UpdatedDate" = now()
     WHERE "NewId" = $1 AND "IsActive" = true RETURNING "NewId"`,
    [id, actor]
  );
  return Boolean(rows[0]);
}

export async function reorderKanbanCards(cards: { id: string; status: string; sequence: number }[], actor: string) {
  if (!cards.length) return;
  await query(
    `UPDATE "DATA_Kanban" AS card SET "Status" = changes."Status", "Sequence" = changes."Sequence", "UpdatedBy" = $4, "UpdatedDate" = now()
     FROM unnest($1::uuid[], $2::text[], $3::integer[]) AS changes("NewId", "Status", "Sequence")
     WHERE card."NewId" = changes."NewId" AND card."IsActive" = true`,
    [cards.map((card) => card.id), cards.map((card) => card.status), cards.map((card) => card.sequence), actor]
  );
}
