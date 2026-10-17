import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/health",
  "/api/auth/login",
  "/api/auth/setup",
  "/api/auth/logout",
  "/api/auth/me",
  "/manifest.json",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Hermes Agent API routes (/api/v1/agent/*) enforce Bearer token or session inside each route handler
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // All UI routes require the HttpOnly session cookie; otherwise redirect immediately to /login
  const sessionCookie = req.cookies.get("akatalife_session")?.value;
  if (!sessionCookie || sessionCookie.length < 32) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
