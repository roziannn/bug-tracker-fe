import { NextRequest } from "next/server";
import { createUser, getUsers } from "@/repositories/user.repository";
import { ok, fail, handleError, parsePaging } from "@/lib/api";
import { createUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, search } = parsePaging(req.nextUrl.searchParams);
    return ok(await getUsers(page, pageSize, search));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createUserSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0].message, 400);

    const result = await createUser(parsed.data, null);
    if (result === "email-taken") return fail("Email sudah terdaftar", 409);
    if (result === "role-not-found") return fail("Role tidak ditemukan", 400);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
