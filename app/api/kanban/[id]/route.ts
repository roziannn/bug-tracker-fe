import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { deleteKanbanCard, updateKanbanCard } from "@/repositories/kanban.repository";

export const dynamic = "force-dynamic";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toPayload(body: Record<string, unknown>) {
  const { id: _id, title: _title, status: _status, sequence: _sequence, ...payload } = body;
  return payload;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!GUID.test(id)) return fail("Invalid Kanban card id", 400);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.title !== "string" || typeof body.status !== "string") return fail("Title and status are required", 400);
    const title = body.title.trim();
    const status = body.status.trim();
    if (!title || title.length > 255) return fail("Title must be between 1 and 255 characters", 400);
    if (!status || status.length > 100) return fail("Status must be between 1 and 100 characters", 400);
    const sequence = Number.isInteger(body.sequence) ? Number(body.sequence) : 0;
    const session = await getSession();
    const card = await updateKanbanCard(id, { title, status, sequence, payload: toPayload(body), actor: session?.email ?? "System" });
    return card ? ok(card) : fail("Kanban card not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!GUID.test(id)) return fail("Invalid Kanban card id", 400);
    const session = await getSession();
    return (await deleteKanbanCard(id, session?.email ?? "System")) ? ok({ deleted: true }) : fail("Kanban card not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
