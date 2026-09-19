"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PROJECT_STATUSES } from "@/drizzle/constants";
import type { ProjectData } from "@/drizzle/projects/get";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateProjectData } from "../actions";

const formSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string(),
  description: z.string().min(10).max(500),
  overrideDescription: z.boolean().nullable(),
  url: z.string().url().nullable().or(z.literal("")),
  overrideURL: z.boolean().nullable(),
  status: z.enum(PROJECT_STATUSES),
  logo: z.string().nullable(),
  comments: z.string().nullable(),
  twitter: z.string().nullable(),
});

type Props = {
  project: ProjectData;
};
export function ProjectForm({ project }: Props) {
  const t = useTranslations("Projects");
  const router = useRouter();

  const statusLabels: Record<(typeof PROJECT_STATUSES)[number], string> = {
    active: t("statusActive"),
    featured: t("statusFeatured"),
    promoted: t("statusPromoted"),
    deprecated: t("statusDeprecated"),
    hidden: t("statusHidden"),
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: project,
  });

  const isPending = form.formState.isSubmitting;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await updateProjectData(project.id, values);
    toast.success(t("editSaved"));
    router.push(`/protected/projects/${values.slug}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{t("editDataTitle")}</CardTitle>
            <CardDescription>
              <code>{project.id}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editNameLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("editNameLabel")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editSlugLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("editSlugLabel")} {...field} />
                  </FormControl>
                  <FormDescription className="flex items-center gap-2">
                    <TriangleAlert className="size-4" />
                    {t("editSlugWarning")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editDescLabel")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("editDescLabel")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overrideDescription"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("editOverrideDescLabel")}</FormLabel>
                    <FormDescription>
                      {t("editOverrideDescHint")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editLogoLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("editLogoLabel")}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editUrlLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("editUrlLabel")}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="overrideURL"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("editOverrideUrlLabel")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel>{t("editStatusLabel")}</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("editStatusLabel")} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editCommentsLabel")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-4">
            <Link
              href={`/protected/projects/${project.slug}`}
              className={buttonVariants({ variant: "secondary" })}
            >
              {t("cancel")}
            </Link>
            <Button type="submit" disabled={isPending}>
              {isPending && <ReloadIcon className="mr-2 size-4 animate-spin" />}
              {t("editSave")}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}