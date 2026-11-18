import { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const notifications = await query<{
      id: number; issueId: string; title: string; description: string;
      href: string; isRead: boolean; createdDate: string;
    }>(
      `SELECT "Id" AS "id", "IssueId" AS "issueId", "Title" AS "title",
        "Description" AS "description", "Href" AS "href", "IsRead" AS "isRead",
        "CreatedDate" AS "createdDate"
       FROM "DATA_Notifications" WHERE "UserId" = $1
       ORDER BY "CreatedDate" DESC${request.nextUrl.searchParams.get("all") === "true" ? "" : " LIMIT 20"}`,
      [session.userId],
    );
    return ok(notifications);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return fail("Unauthorized", 401);
    const body = await request.json().catch(() => null);
    if (body?.markAllRead !== true) return fail("Invalid notification update", 400);
    await query(
      `UPDATE "DATA_Notifications" SET "IsRead" = true WHERE "UserId" = $1 AND "IsRead" = false`,
      [session.userId],
    );
    return ok({ updated: true });
  } catch (error) {
    return handleError(error);
  }
}
