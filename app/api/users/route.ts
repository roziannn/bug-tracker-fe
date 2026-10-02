import { NextRequest } from "next/server";
import { getUsers } from "@/repositories/user.repository";
import { ok, handleError, parsePaging } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { page, pageSize, search } = parsePaging(req.nextUrl.searchParams);
    return ok(await getUsers(page, pageSize, search));
  } catch (err) {
    return handleError(err);
  }
}