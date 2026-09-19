"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createProjectAction } from "@/actions/projects-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateProjectType } from "@/drizzle/projects";
import { parseGithubRepoUrl } from "@/lib/github/repo-url";

const PROJECT_TYPE_OPTIONS: { value: CreateProjectType; label: string }[] = [
  { value: "skill", label: "skill" },
  { value: "application", label: "application" },
  { value: "client", label: "client" },
  { value: "server", label: "server" },
  { value: "persona", label: "persona" },
];

const TYPE_TO_KEY: Record<CreateProjectType, string> = {
  skill: "typeSkill",
  application: "typeApplication",
  client: "typeClient",
  server: "typeServer",
  persona: "typePersona",
};

export function AddProjectButton() {
  const t = useTranslations("Projects");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const formSchema = z.object({
    gitHubURL: z
      .string()
      .min(3, t("addUrlMin"))
      .refine((value) => parseGithubRepoUrl(value) !== null, t("addInvalidUrl")),
    type: z.enum(["skill", "application", "client", "server", "persona"], {
      error: t("addTypeRequired"),
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { gitHubURL: "", type: undefined },
  });

  const isPending = form.formState.isSubmitting;
  const rawUrl = form.watch("gitHubURL");
  const repoPreview = parseGithubRepoUrl(rawUrl);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const normalized = parseGithubRepoUrl(values.gitHubURL);
      const project = await createProjectAction(normalized?.fullName ?? values.gitHubURL, values.type);
      toast.success(t("addSuccess", { name: project.name }));
      setOpen(false);
      router.push(`/protected/projects/${project.slug}`);
    } catch (error) {
      toast.error(t("addFailure", { error: (error as Error).message }));
    }
  }

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="w-full sm:w-auto">
            {t("addTrigger")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[92dvh] overflow-y-auto">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>{t("addTitle")}</DialogTitle>
              <DialogDescription>
                {t("addDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="gitHubURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("addGithubUrlLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("addGithubUrlPlaceholder")}
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <div className="text-xs space-y-1">
                      {repoPreview ? (
                        <p className="text-muted-foreground">
                          {t("addRecognized", { fullName: repoPreview.fullName })}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">
                          {t("addSupportedFormats", {
                            short: "owner/repo",
                            full: "https://github.com/owner/repo",
                            git: ".git",
                          })}
                        </p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("addTypeLabel")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      required
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("addTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {t(TYPE_TO_KEY[opt.value])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending && (
                  <ReloadIcon className="mr-2 size-4 animate-spin" />
                )}
                {t("addSubmit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}