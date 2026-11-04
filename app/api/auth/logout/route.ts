import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { addAuditTrailEvent } from "@/repositories/audit-trail.repository";

export async function POST() {
  const session = await getSession();
  await clearSessionCookie();
  if (session) {
    await addAuditTrailEvent({
      actor: session.email,
      action: "Logout",
      targetType: "Authentication",
      targetName: session.name,
      detail: "User signed out",
    });
  }
  return NextResponse.json({ ok: true });
}
