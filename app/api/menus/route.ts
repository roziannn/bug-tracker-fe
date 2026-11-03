import { NextRequest } from "next/server";
import { createMenu, getMenus } from "@/repositories/menu.repository";
import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { menuSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return ok(await getMenus());
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = menuSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await createMenu(parsed.data, session?.email ?? "System");
    if (result === "parent-not-found") return fail("Parent menu not found", 400);
    if (result === "invalid-parent") return fail("Invalid parent menu", 400);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
