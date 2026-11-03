import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentUser } from "@/repositories/access.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // User yang sudah dihapus atau dinonaktifkan setelah login tidak lagi dianggap login.
  const user = await getCurrentUser(session.email);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(user);
}
