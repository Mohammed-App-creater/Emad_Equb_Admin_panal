export const locales = ["en", "am"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  am: "አማርኛ",
};

// Cookie the locale toggle writes and the server request config reads.
export const LOCALE_COOKIE = "EKUB_LOCALE";
