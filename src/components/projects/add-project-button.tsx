"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  gitHubURL: z.string().url().startsWith("https://github.com/"),
});

export function AddProjectButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { gitHubURL: "" },
  });

  const isPending = form.formState.isSubmitting;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const project = await createProjectAction(values.gitHubURL);
      toast.success(`项目创建成功: ${project.name}`);
      setOpen(false);
      router.push(`/protected/projects/${project.slug}`);
    } catch (error) {
      toast.error(`创建项目失败: ${(error as Error).message}`);
    }
  }

  return (
    <Form {...form}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default">添加项目</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle>添加项目</DialogTitle>
              <DialogDescription>
                指定GitHub URL 添加项目
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-[100px_1fr] items-center gap-4">
              <Label htmlFor="name" className="text-right">
                GitHub URL
              </Label>
              <FormField
                control={form.control}
                name="gitHubURL"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="https://github.com/..." {...field} />
                    </FormControl>
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
