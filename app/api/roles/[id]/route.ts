import { NextRequest } from "next/server";
import { getRoleById } from "@/repositories/role.repository";
import { ok, fail, handleError, parseId } from "@/lib/api";

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