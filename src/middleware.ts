import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard app/admin routes (and optionally the homepage later)
  const isAdminRoute = pathname.startsWith("/admin");
  const isAppRoute = pathname.startsWith("/app");

  if (!isAdminRoute && !isAppRoute) {
    return NextResponse.next();
  }

  const token = await getToken({ req });

  // Not logged in -> go to login
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = (token as any).role;

  // Role enforcement
  if (isAdminRoute && role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  if (isAppRoute && role !== "CLIENT") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
