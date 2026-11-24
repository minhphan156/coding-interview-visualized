import type { Problem } from "@/lib/viz/types";
import { containerWithMostWater } from "./container-with-most-water";
import { mergeStringsAlternately } from "./merge-strings-alternately";
import { moveZeroes } from "./move-zeroes";
import { numberOfIslands } from "./number-of-islands";
import { twoSum } from "./two-sum";
import { validParentheses } from "./valid-parentheses";

export const problems: Problem[] = [
  twoSum,
  containerWithMostWater,
  validParentheses,
  numberOfIslands,
  mergeStringsAlternately,
  moveZeroes,
].sort((a, b) => a.number - b.number);

export function getProblem(slug: string): Problem | undefined {
  return problems.find((p) => p.slug === slug);
}
