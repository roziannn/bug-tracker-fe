import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createKanbanCard, listKanbanCards } from "@/repositories/kanban.repository";

export const dynamic = "force-dynamic";

function toPayload(body: Record<string, unknown>) {
  const { id: _id, title: _title, status: _status, sequence: _sequence, ...payload } = body;
  return payload;
}

export async function GET() {
  try {
    return ok(await listKanbanCards());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.title !== "string" || typeof body.status !== "string") return fail("Title and status are required", 400);
    const title = body.title.trim();
    const status = body.status.trim();
    if (!title || title.length > 255) return fail("Title must be between 1 and 255 characters", 400);
    if (!status || status.length > 100) return fail("Status must be between 1 and 100 characters", 400);
    const session = await getSession();
    const card = await createKanbanCard({ title, status, payload: toPayload(body), actor: session?.email ?? "System" });
    return ok(card, 201);
  } catch (err) {
    return handleError(err);
  }
}
