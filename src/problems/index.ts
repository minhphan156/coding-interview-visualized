import type { Problem } from "@/lib/viz/types";
import { containerWithMostWater } from "./container-with-most-water";
import { maximumAverageSubarrayI } from "./maximum-average-subarray-i";
import { mergeStringsAlternately } from "./merge-strings-alternately";
import { moveZeroes } from "./move-zeroes";
import { numberOfIslands } from "./number-of-islands";
import { rateLimiter } from "./rate-limiter";
import { twoSum } from "./two-sum";
import { validParentheses } from "./valid-parentheses";

export const problems: Problem[] = [
  twoSum,
  containerWithMostWater,
  validParentheses,
  numberOfIslands,
  mergeStringsAlternately,
  moveZeroes,
  maximumAverageSubarrayI,
  rateLimiter,
].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));

export function getProblem(slug: string): Problem | undefined {
  return problems.find((p) => p.slug === slug);
}

export function problemHeading(problem: Problem): string {
  return problem.number !== undefined ? `${problem.number}. ${problem.title}` : problem.title;
}
