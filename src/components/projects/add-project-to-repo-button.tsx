"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReloadIcon } from "@radix-ui/react-icons";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { addProjectToRepoAction } from "@/actions/projects-actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_TYPES } from "@/drizzle/constants";

const PROJECT_TYPE_LABELS: Record<(typeof PROJECT_TYPES)[number], string> = {
  client: "Client",
  server: "Server",
  application: "Application",
  skill: "Skill",
  persona: "Persona",
};

const formSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),
  type: z.enum(PROJECT_TYPES),
});

export function AddProjectToRepoButton({ repoId }: { repoId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "", type: "application" },
  });

  const isPending = form.formState.isSubmitting;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const project = await addProjectToRepoAction({ ...values, repoId });
      toast.success(`项目已添加: ${project.name}`);
      setOpen(false);
      router.push(`/projects/${project.slug}`);
    } catch (error) {
      toast.error(`无法创建项目: ${(error as Error).message}`);
    }
  }

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default">
            <Plus className="size-4" />
            添加项目到仓库
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>添加项目</DialogTitle>
              <DialogDescription>
                指定要添加到此仓库的项目名称
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <Label htmlFor="name" className="text-right">
                项目名称
              </Label>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Label htmlFor="description" className="text-right">
                描述
              </Label>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Label htmlFor="type" className="text-right">
                类型
              </Label>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {PROJECT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <ReloadIcon className="mr-2 size-4 animate-spin" />
                )}
                添加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
