import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("token")?.value;
  const companyId = req.cookies.get("company_id")?.value;

  // 🟢 LOGIN PAGE
  if (pathname.startsWith("/login")) {
    if (!token) {
      return NextResponse.next(); // مش عامل login → سيبه
    }

    // لو عامل login
    if (!companyId) {
      return NextResponse.redirect(new URL("/select-company", req.url));
    }

    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 🟢 SELECT COMPANY
  if (pathname.startsWith("/select-company")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  }

  // 🟢 باقي النظام
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!companyId) {
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