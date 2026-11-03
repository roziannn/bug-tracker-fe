import { NextRequest } from "next/server";
import { getRoleById } from "@/repositories/role.repository";
import { getRoleAccess, setRoleAccess } from "@/repositories/access.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { roleAccessSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);
    if (!(await getRoleById(id))) return fail("Role not found", 404);

    return ok(await getRoleAccess(id));
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const parsed = roleAccessSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail("menus and actions must be lists of codes", 400);

    const session = await getSession();
    const result = await setRoleAccess(id, parsed.data, session?.email ?? "System");
    if (result === "not-found") return fail("Role not found", 404);

    return ok(await getRoleAccess(id));
  } catch (err) {
    return handleError(err);
  }
}
