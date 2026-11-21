import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/chat",
  "/studio",
  "/models",
  "/benchmark",
  "/api",
  "/projects",
  "/extensions",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get("astra_session")?.value);

  if (PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/studio/:path*",
    "/models/:path*",
    "/benchmark/:path*",
    "/api/:path*",
    "/projects/:path*",
    "/extensions/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
