import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

// Boleh diakses tanpa login. Logout sengaja publik supaya cookie yang sudah kedaluwarsa tetap bisa dibersihkan.
const PUBLIC_PAGES = ["/login"];
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout"];

async function isValidSession(token: string | undefined) {
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const valid = await isValidSession(token);

  const isPublicPage = PUBLIC_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublicPage || PUBLIC_API.includes(pathname)) {
    // Sudah login, tidak perlu melihat halaman login lagi.
    if (valid && isPublicPage) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (valid) return NextResponse.next();

  const response = pathname.startsWith("/api/")
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", req.url));

  if (token) response.cookies.delete(COOKIE_NAME);
  return response;
}

export const config = {
  // Semua halaman dan API, kecuali aset statis.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
