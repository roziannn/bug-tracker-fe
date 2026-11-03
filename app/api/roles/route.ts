import { NextRequest } from "next/server";
import { createRole, getRoles } from "@/repositories/role.repository";
import { ok, fail, handleError, parsePaging } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { roleSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, search } = parsePaging(req.nextUrl.searchParams);
    return ok(await getRoles(page, pageSize, search));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = roleSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const session = await getSession();
    const result = await createRole(parsed.data, session?.email ?? "System");
    if (result === "name-taken") return fail("Role name is already in use", 409);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
