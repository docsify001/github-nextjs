import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * Proxy / Middleware
 *
 * 1. next-intl: negotiate the locale (NEXT_LOCALE cookie, no URL prefix), set the
 *    locale cookie and rewrite the request into the `[locale]` segment so that
 *    the matching routes render.
 * 2. supabase: refresh session cookies and guard protected routes.
 *
 * https://next-intl.dev/docs/routing/middleware
 */
export async function proxy(request: NextRequest) {
  // 1. next-intl locale handling
  const intlResponse = intlMiddleware(request);

  // 2. supabase session cookie refresh + protected route guard
  const sessionResponse = await updateSession(request);

  // If the auth guard forced a redirect (e.g. logged-out -> /auth/login), honor it.
  if (sessionResponse.status >= 300 && sessionResponse.status < 400) {
    return sessionResponse;
  }

  // Otherwise keep the intl response (rewrite + locale cookie) and forward any
  // refreshed session cookies set by supabase.
  const response = intlResponse ?? sessionResponse;
  for (const cookie of sessionResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (not localized)
     * - auth confirmation route handlers
     * - _next/static, _next/image (static/internal)
     * - favicon.ico + static media files
     */
    "/((?!api|auth/confirm|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};