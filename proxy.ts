import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Hardcoded production domain for HTTPS redirect
const PRODUCTION_DOMAIN = "chesapeakechatbot.chat";

export function proxy(request: NextRequest) {
  const { hostname, protocol, pathname, search } = request.nextUrl;

  // ── Skip redirect for non-production environments ──────────────────────
  // Allow localhost, 127.0.0.1, private IPs, and development domains
  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.endsWith(".local");

  if (isLocalHost) {
    return NextResponse.next();
  }

  // ── Detect the effective protocol ─────────────────────────────────────
  // Respect x-forwarded-proto header set by reverse proxy (nginx)
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const effectiveProtocol = forwardedProto || protocol;

  // Already HTTPS — pass through
  if (effectiveProtocol === "https") {
    return NextResponse.next();
  }

  // ── HTTP → HTTPS redirect ────────────────────────────────────────────
  // Redirect to the hardcoded production domain over HTTPS, preserving
  // the full path and query string.
  const httpsUrl = new URL(`https://${PRODUCTION_DOMAIN}${pathname}${search}`);
  return NextResponse.redirect(httpsUrl, 308);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes — health checks etc.)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - .well-known (Let's Encrypt ACME challenges)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|\\.well-known).*)",
  ],
};
