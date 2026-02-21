import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const secret = process.env.AUTH_SECRET;

export default async function middleware(req) {
  const url = req.nextUrl.clone();

  const token = await getToken({
    req,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuth = !!token;

  // 🚫 block login page for logged-in user
  if (isAuth && url.pathname === "/login") {
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 🔒 admin routes
  if (url.pathname.startsWith("/admin")) {
    if (!isAuth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== "SUPER_ADMIN" && token.role !== "ADMIN") {
      url.pathname = "/unauthorized";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 🔒 dashboard
  if (url.pathname.startsWith("/dashboard") && !isAuth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*"],
};
