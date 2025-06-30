import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(input: string, maxLength = 50) {
  const isTruncated = input.length > maxLength;
  return isTruncated ? `${input.slice(0, maxLength)}...` : input;
}
