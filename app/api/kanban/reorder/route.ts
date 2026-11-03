import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { reorderKanbanCards } from "@/repositories/kanban.repository";

export const dynamic = "force-dynamic";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { cards?: { id?: unknown; status?: unknown; sequence?: unknown }[] } | null;
    if (!Array.isArray(body?.cards)) return fail("Cards are required", 400);
    const cards = body.cards.map((card) => ({ id: String(card.id ?? ""), status: String(card.status ?? ""), sequence: Number(card.sequence) }));
    if (cards.some((card) => !GUID.test(card.id) || !card.status || card.status.length > 100 || !Number.isInteger(card.sequence) || card.sequence < 0)) {
      return fail("Invalid card ordering", 400);
    }
    const session = await getSession();
    await reorderKanbanCards(cards, session?.email ?? "System");
    return ok({ updated: cards.length });
  } catch (err) {
    return handleError(err);
  }
}
