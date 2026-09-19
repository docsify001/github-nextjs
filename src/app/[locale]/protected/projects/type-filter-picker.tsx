"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { PROJECT_TYPES } from "@/drizzle/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "all";

type Props = {
  type?: (typeof PROJECT_TYPES)[number];
};

export function TypeFilterPicker({ type }: Props) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const typeLabels: Record<(typeof PROJECT_TYPES)[number], string> = {
    client: t("typeClient"),
    server: t("typeServer"),
    application: t("typeApplication"),
    skill: t("typeSkill"),
    persona: t("typePersona"),
  };

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_VALUE) {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    params.set("offset", "0");
    router.push(pathname + "?" + params.toString());
  };

  return (
    <Select onValueChange={onChange} value={type ?? ALL_VALUE}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder={t("typeFilterPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{t("allTypes")}</SelectItem>
        {PROJECT_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {typeLabels[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}