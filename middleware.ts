import { NextResponse } from "next/server";
// import { NextRequest, NextResponse } from "next/server";
// import { jwtVerify } from "jose";

// TEMP: auth middleware dinonaktifkan sementara. Aktifkan lagi dengan
// meng-uncomment blok di bawah dan menghapus pass-through di paling bawah.

// const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
// const PUBLIC_PATHS = ["/login"];

// export async function middleware(req: NextRequest) {
//   const { pathname } = req.nextUrl;
//
//   if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
//     return NextResponse.next();
//   }
//
//   const token = req.cookies.get("session")?.value;
//
//   if (!token) {
//     return NextResponse.redirect(new URL("/login", req.url));
//   }
//
//   try {
//     await jwtVerify(token, JWT_SECRET);
//     return NextResponse.next();
//   } catch {
//     const res = NextResponse.redirect(new URL("/login", req.url));
//     res.cookies.delete("session");
//     return res;
//   }
// }

// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
// };

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
