import { defineRouting } from "next-intl/routing";

export const DEFAULT_LOCALE = "zh";
export const LOCALES = ["en", "zh"] as const;

// The name of the cookie that is used to determine the locale
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

/**
 * Next.js internationalized routing
 *
 * https://next-intl.dev/docs/routing
 */
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: LOCALES,
  // Default locale when no locale matches
  defaultLocale: DEFAULT_LOCALE,
  // Auto detect locale
  // https://next-intl.dev/docs/routing/middleware#locale-detection
  localeDetection: false,
  // Once a locale is detected, it will be remembered for
  // future requests by being stored in the NEXT_LOCALE cookie.
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
  },
  // The prefix to use for the locale in the URL. With `never` the locale is
  // only stored in the cookie, so all existing routes/links keep working
  // regardless of the active locale.
  // https://next-intl.dev/docs/routing#locale-prefix
  localePrefix: "never",
});