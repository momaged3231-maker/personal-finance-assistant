import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyValue } from "@/lib/cookie-sign";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip Next.js internal files, static assets, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/supabase") ||
    pathname.startsWith("/api/ai/test") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Check for active tenant auth cookie (or impersonation cookie).
  //    Values are HMAC-signed so a cookie can't be forged to impersonate an admin.
  const userIdCookie = request.cookies.get("finance_user_id")?.value;
  const impersonateCookie = request.cookies.get("finance_impersonate_user_id")?.value;
  const isAuthenticated = Boolean(verifyValue(userIdCookie) || verifyValue(impersonateCookie));

  // 3. Define public routes
  const isPublicRoute =
    pathname === "/landing" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/auth");

  // 4. Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true },
        { status: 401 }
      );
    }
    const landingUrl = new URL("/landing", request.url);
    return NextResponse.redirect(landingUrl);
  }

  // 5. If authenticated user visits login or signup, redirect to dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    const dashboardUrl = new URL("/", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};