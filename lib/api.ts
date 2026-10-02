import { NextResponse } from "next/server";

export function ok<T>(body: T, status = 200) {
  return NextResponse.json(body, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(err: unknown) {
  console.error(err);
  return fail("Internal server error", 500);
}

export function parsePaging(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const search = searchParams.get("search")?.trim() || null;
  return { page, pageSize, search };
}

export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}