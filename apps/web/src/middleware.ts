import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/options", "/dashboard"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for access_token cookie
    const token = request.cookies.get("access_token");

    if (!token) {
      // Redirect to home page with login prompt
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("login_required", "true");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/options/:path*", "/dashboard/:path*"],
};
