import { NextRequest } from "next/server";
import { getUserById } from "@/repositories/user.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";

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