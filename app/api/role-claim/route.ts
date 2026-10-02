import { NextRequest } from "next/server";
import { getRoleClaims } from "@/repositories/roleClaim.repository";
import { ok, handleError, parsePaging, parseId } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const { page, pageSize, search } = parsePaging(sp);
    const roleIdRaw = sp.get("roleId");
    const roleId = roleIdRaw ? parseId(roleIdRaw) : null;

    return ok(await getRoleClaims(page, pageSize, search, roleId));
  } catch (err) {
    return handleError(err);
  }
}