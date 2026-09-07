import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./config";

// No locale-in-URL routing: the active locale is stored in a cookie set by the
// TopBar language toggle. This keeps the admin URLs clean while still giving us
// full server-side message loading.
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale =
    cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
