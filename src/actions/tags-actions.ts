"use server";

import { revalidatePath } from "next/cache";

import { createTag as apiCreateTag } from "@/drizzle/tags";

export async function createTag(tagName: string) {
  const createdTag = await apiCreateTag(tagName);

  revalidatePath(`/tags`);

  return createdTag;
}
