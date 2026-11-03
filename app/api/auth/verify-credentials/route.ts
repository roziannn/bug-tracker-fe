import { NextRequest, NextResponse } from "next/server";

import { verifyPassword } from "@/lib/password";
import { getSession } from "@/lib/auth";
import { getUserForAuth } from "@/repositories/user.repository";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;
    const username = body?.username?.trim();
    const password = body?.password;
    if (!username || !password) return NextResponse.json({ error: "Username and password are required" }, { status: 400 });

    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    const user = await getUserForAuth(username);
    if (!user || !(await verifyPassword(password, user.Password))) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }
    if (!user.IsActive) return NextResponse.json({ error: "This account is inactive" }, { status: 403 });
    if (user.Id !== session.userId) return NextResponse.json({ error: "Use the credentials for your signed-in account" }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("CREDENTIAL VERIFICATION ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
