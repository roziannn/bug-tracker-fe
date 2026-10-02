import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { getUserForAuth } from "@/repositories/user.repository";
import { verifyPassword } from "@/lib/password";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const genericError = NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

    const user = await getUserForAuth(email);
    if (!user) return genericError;
    if (!user.IsActive) {
      return NextResponse.json({ error: "Akun tidak aktif, hubungi admin" }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.Password);
    if (!valid) return genericError;

    await createSessionCookie({
      userId: user.Id,
      email: user.Email,
      name: user.Name,
      roleId: 0,
    });

    return NextResponse.json({ ok: true, user: { id: user.Id, name: user.Name, email: user.Email } });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}