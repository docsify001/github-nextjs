"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PROJECT_TYPES } from "@/drizzle/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_LABELS: Record<(typeof PROJECT_TYPES)[number], string> = {
  client: "Client",
  server: "Server",
  application: "Application",
  skill: "Skill",
  persona: "Persona",
};

const ALL_VALUE = "all";

type Props = {
  type?: (typeof PROJECT_TYPES)[number];
};

export function TypeFilterPicker({ type }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
        <SelectValue placeholder="类型" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>全部</SelectItem>
        {PROJECT_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {TYPE_LABELS[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
