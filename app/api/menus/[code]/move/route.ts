import { NextRequest } from "next/server";
import { moveMenu } from "@/repositories/menu.repository";
import { ok, fail, handleError } from "@/lib/api";
import { menuMoveSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const parsed = menuMoveSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("direction must be -1 or 1", 400);

    const result = await moveMenu((await params).code, parsed.data.direction);
    return result === "not-found" ? fail("Menu not found", 404) : ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
