"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import type { ProjectListOrderByKey } from "@/drizzle/projects/find";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  sort: ProjectListOrderByKey;
};
export function ProjectListSortOptionPicker({ sort }: Props) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const options = [
    { value: "-stars", text: t("sortByStarsDesc") },
    { value: "stars", text: t("sortByStarsAsc") },
    { value: "-createdAt", text: t("sortByCreatedAtDesc") },
    { value: "createdAt", text: t("sortByCreatedAtAsc") },
  ];

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("offset", "0");
    router.push(pathname + "?" + params.toString());
  };
  return (
    <Select onValueChange={onChange} value={sort}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder={t("sortPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}