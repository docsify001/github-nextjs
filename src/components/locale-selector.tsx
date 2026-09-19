"use client";

import { useParams } from "next/navigation";
import { type Locale, useLocale } from "next-intl";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalePathname, useLocaleRouter } from "@/i18n/navigation";
import { DEFAULT_LOCALE, routing } from "@/i18n/routing";

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

/**
 * 1. LocaleSelector
 *
 * By combining useLocaleRouter with useLocalePathname, you can change the locale
 * for the current page programmatically by navigating to the same pathname, while
 * overriding the locale.
 *
 * https://next-intl.dev/docs/routing/navigation#userouter
 */
export default function LocaleSelector() {
  const router = useLocaleRouter();
  const pathname = useLocalePathname();
  const params = useParams();
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const onSelectChange = (nextLocale: Locale) => {
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params },
        { locale: nextLocale }
      );
    });
  };

  return (
    <Select
      defaultValue={DEFAULT_LOCALE}
      value={locale}
      onValueChange={onSelectChange}
    >
      <SelectTrigger className="h-9 w-fit cursor-pointer gap-2" aria-label="Language">
        <Globe className="size-4" />
        <SelectValue>
          {locale === "zh" ? "中文" : "English"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {LOCALE_OPTIONS.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value as Locale}
            className="flex cursor-pointer items-center gap-2"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}