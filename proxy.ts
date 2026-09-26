import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyValue } from "@/lib/cookie-sign";

/**
 * Apply a baseline of security headers to every response.
 * CSP intentionally omitted: Next injects inline scripts, so a strict CSP
 * would need nonce plumbing — tracked separately if a stricter policy is wanted.
 */
function secure(res: NextResponse, request: NextRequest): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  if (request.nextUrl.protocol === "https:") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return res;
}

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
    return secure(NextResponse.next(), request);
  }

  // 2. Check for active tenant auth cookie (or impersonation cookie).
  //    Values are HMAC-signed so a cookie can't be forged to impersonate an admin.
  const userIdCookie = request.cookies.get("finance_user_id")?.value;
  const impersonateCookie = request.cookies.get("finance_impersonate_user_id")?.value;
  const isAuthenticated = Boolean(verifyValue(userIdCookie) || verifyValue(impersonateCookie));

  // 3. Define public routes
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/landing" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/reset-password" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/offline" ||
    pathname.startsWith("/google") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/push/vapid" ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/marketing");

  // 4. Redirect unauthenticated users away from protected routes.
  //    Root (/) is public: its page renders the landing for guests.
  if (!isAuthenticated && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return secure(
        NextResponse.json(
          { error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true },
          { status: 401 }
        ),
        request
      );
    }
    const landingUrl = new URL("/", request.url);
    return secure(NextResponse.redirect(landingUrl), request);
  }

  // 5. If authenticated user visits login, signup, or landing, send them to dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup" || pathname === "/landing")) {
    const dashboardUrl = new URL("/", request.url);
    return secure(NextResponse.redirect(dashboardUrl), request);
  }

  return secure(NextResponse.next(), request);
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