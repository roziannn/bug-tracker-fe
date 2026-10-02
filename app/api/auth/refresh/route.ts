import { NextResponse } from "next/server";
import { getSession, createSessionCookie } from "@/lib/auth";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await createSessionCookie({
    userId: session.userId,
    email: session.email,
    name: session.name,
    roleId: session.roleId,
  });

  return NextResponse.json({ ok: true });
}