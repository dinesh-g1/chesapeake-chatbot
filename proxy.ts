import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hardcoded domain for HTTPS redirect
const DOMAIN = "chesapeakechatbot.chat";

export function proxy(request: NextRequest) {
  const { protocol, host, pathname, search } = request.nextUrl;

  // Check the effective protocol — respect x-forwarded-proto for reverse proxies
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const effectiveProtocol = forwardedProto || protocol;

  // If already HTTPS, let it through
  if (effectiveProtocol === "https") {
    return NextResponse.next();
  }

  // If HTTP, redirect to HTTPS on the hardcoded domain
  const httpsUrl = new URL(`https://${DOMAIN}${pathname}${search}`);
  return NextResponse.redirect(httpsUrl, 308);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - .well-known (Let's Encrypt ACME challenges)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.well-known).*)",
  ],
};
