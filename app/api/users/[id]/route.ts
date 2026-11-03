import { NextRequest } from "next/server";
import { getUserById, updateUser } from "@/repositories/user.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const user = await getUserById(id);
    return user ? ok(user) : fail("User not found", 404);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = parseId((await params).id);
    if (!id) return fail("Invalid id", 400);

    const parsed = updateUserSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await updateUser(id, parsed.data, session?.email ?? null);
    if (result === "not-found") return fail("User not found", 404);
    if (result === "email-taken") return fail("Email is already registered", 409);
    if (result === "role-not-found") return fail("Role not found", 400);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
