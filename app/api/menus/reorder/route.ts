import { NextRequest } from "next/server";
import { moveMenu } from "@/repositories/menu.repository";
import { ok, fail, handleError } from "@/lib/api";
import { menuReorderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const parsed = menuReorderSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid reorder request", 400);

    const result = await moveMenu(parsed.data.code, parsed.data.direction);
    return result === "not-found" ? fail("Menu not found", 404) : ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
