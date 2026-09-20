import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const secret = process.env.AUTH_SECRET;

export default async function proxy(req) {
  const url = req.nextUrl.clone();

  // Store credentials are separate from the legacy User token. Only the
  // finance/POS admin surfaces migrated to StoreMember may use this boundary.
  const storeCookieName = `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}authjs.store.session-token`;
  const hasStoreCredential = req.cookies.has(storeCookieName);
  if (url.pathname.startsWith("/admin") && hasStoreCredential) {
    const migrated = url.pathname === "/admin" || /^\/admin\/pos(\/|$)/.test(url.pathname) ||
      /^\/admin\/accounts(\/|$)/.test(url.pathname) ||
      url.pathname === "/admin/procurement" ||
      /^\/admin\/procurement\/(expenses|payments)(\/|$)/.test(url.pathname);
    if (!migrated) return NextResponse.redirect(new URL("/unauthorized", req.url));
    // The route's server-side Store permission check also verifies the live
    // member, role, and trusted hostname. A cookie alone grants no data access.
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuth = !!token;

  // 🚫 Block login page for logged-in user
  if (isAuth && url.pathname === "/login") {
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 🔒 Admin Route → USER cannot access
  if (url.pathname.startsWith("/admin")) {
    if (!isAuth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!token?.role || token.role === "USER") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }
  // 🔒 My Account Route → Only USER allowed
  if (url.pathname.startsWith("/my-account")) {
    if (!isAuth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ❌ Non-USER blocked
    // if (!token?.role || token.role !== "USER") {
    //   return NextResponse.redirect(new URL("/unauthorized", req.url));
    // }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/my-account/:path*", "/admin/:path*"],
};
// import { auth } from "@/auth";
// import { NextResponse } from "next/server";

// export default auth((req) => {
//   console.log("MIDDLEWARE AUTH:", req.auth);
//   const isAuth = !!req.auth;
//   const url = req.nextUrl;

//   // 🚫 Block login page for logged-in user
//   if (isAuth && url.pathname === "/login") {
//     return NextResponse.redirect(new URL("/", req.url));
//   }

//   // 🔒 Admin Route
//   if (url.pathname.startsWith("/admin")) {
//     if (!isAuth) {
//       const loginUrl = new URL("/login", req.url);
//       loginUrl.searchParams.set("callbackUrl", url.pathname);
//       return NextResponse.redirect(loginUrl);
//     }
//   }

//   // 🔒 My Account Route
//   if (url.pathname.startsWith("/my-account")) {
//     if (!isAuth) {
//       const loginUrl = new URL("/login", req.url);
//       loginUrl.searchParams.set("callbackUrl", url.pathname);
//       return NextResponse.redirect(loginUrl);
//     }
//   }

//   return NextResponse.next();
// });

// export const config = {
//   matcher: ["/login", "/my-account/:path*", "/admin/:path*"],
// };
