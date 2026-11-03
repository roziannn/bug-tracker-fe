import { NextRequest } from "next/server";
import { getRoleById, updateRole } from "@/repositories/role.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { roleSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const role = await getRoleById(id);
    return role ? ok(role) : fail("Role not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const parsed = roleSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateRole(id, parsed.data, session?.email ?? null);
    if (result === "not-found") return fail("Role not found", 404);
    if (result === "name-taken") return fail("Role name is already in use", 409);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
