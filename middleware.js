import { ADMIN_ROUTES, LOGIN, ROOT, USER_ROUTES } from "@/lib/routes";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const secret = process.env.AUTH_SECRET;

export default async function middleware(req) {
  const { nextUrl } = req;

  // Decode the token using next-auth/jwt
  const token2 = await getToken({ req, secret });
  const token = await getToken({
    req,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuthenticated = !!token;
  const userRole = token?.role || null;

  // Prevent logged-in users from accessing login or register pages
  if (isAuthenticated && ["/login", "/register"].includes(nextUrl.pathname)) {
    return NextResponse.redirect(new URL(ROOT, nextUrl));
  }

  // Restrict authenticated routes based on roles
  const isUserRoute = USER_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route)
  );
  const isAdminRoute = ADMIN_ROUTES.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  if (isUserRoute) {
    if (!isAuthenticated || userRole !== "USER") {
      return NextResponse.redirect(new URL(LOGIN, nextUrl));
    }
  }

  if (isAdminRoute) {
    if (!isAuthenticated || userRole !== "ADMIN") {
      return NextResponse.redirect(new URL(LOGIN, nextUrl));
    }
  }

  // All other routes are public and can be accessed without restrictions
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/admin",
    "/dashboard",
    "/(api|trpc)(.*)",
  ],
};
