import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("token")?.value;
  const companyId = req.cookies.get("company_id")?.value;

  // صفحات عامة
  if (pathname.startsWith("/login")) {
    if (token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // لازم يكون login
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // منع دخول أي صفحة بدون اختيار شركة
  if (!companyId && pathname !== "/select-company") {
    return NextResponse.redirect(new URL("/select-company", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/trips/:path*",
    "/vehicles/:path*",
    "/users/:path*",
    "/select-company",
    "/login",
  ],
};