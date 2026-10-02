import { NextRequest } from "next/server";
import { getRoles } from "@/repositories/role.repository";
import { ok, handleError, parsePaging } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, search } = parsePaging(req.nextUrl.searchParams);
    return ok(await getRoles(page, pageSize, search));
  } catch (err) {
    return handleError(err);
  }
}