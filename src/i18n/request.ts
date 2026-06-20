import { getRequestConfig } from "next-intl/server";

/**
 * Single-locale setup for now (pt-PT). When EN/ES are added, replace the
 * hardcoded locale with a cookie/profile-based lookup (e.g. read user.locale
 * from the DAL).
 */
const DEFAULT_LOCALE = "pt";

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
