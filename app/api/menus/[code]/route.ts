import { NextRequest } from "next/server";
import { deleteMenu, getMenuByCode, setMenuVisible, updateMenu } from "@/repositories/menu.repository";
import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { menuSchema, menuVisibleSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const menu = await getMenuByCode((await params).code);
    return menu ? ok(menu) : fail("Menu not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const parsed = menuSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateMenu((await params).code, parsed.data, session?.email ?? "System");
    if (result === "not-found") return fail("Menu not found", 404);
    if (result === "parent-not-found") return fail("Parent menu not found", 400);
    if (result === "invalid-parent") return fail("Parent must be a main menu without sub menus of its own", 400);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}

// Dipakai untuk switch tampil/sembunyi.
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const parsed = menuVisibleSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("visible must be true or false", 400);

    const session = await getSession();
    const result = await setMenuVisible((await params).code, parsed.data.visible, session?.email ?? "System");
    return result === "not-found" ? fail("Menu not found", 404) : ok(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const deleted = await deleteMenu((await params).code);
    return deleted ? ok({ ok: true }) : fail("Menu not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
