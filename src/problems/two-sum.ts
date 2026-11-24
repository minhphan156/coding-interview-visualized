import { Tracer, expectInt, expectIntArray } from "@/lib/viz/tracer";
import type { Problem, Viz } from "@/lib/viz/types";

const code = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            need = target - num
            if need in seen:
                return [seen[need], i]
            seen[num] = i
        return []`;

export const twoSum: Problem = {
  slug: "two-sum",
  number: 1,
  title: "Two Sum",
  difficulty: "Easy",
  url: "https://leetcode.com/problems/two-sum/",
  pattern: "Hash map lookup",
  tags: ["Array", "Hash Table"],
  description: [
    "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
    "Each input has exactly one solution, and you may not use the same element twice.",
  ],
  guide: {
    why: {
      intro: "This is the foundation for the Hash Map pattern: trading memory for speed. It tests:",
      points: [
        "Can you see that brute force checks every pair in O(n²)?",
        "Can you turn \"find a partner\" into an O(1) lookup?",
        "Can you avoid pairing an element with itself?",
      ],
      analogy: "Think of a party guest list: each arrival checks the list for the partner they need, then writes their own name down.",
    },
    what: {
      summary: "Return the indices of the two numbers that add up to target.",
      examples: [
        {
          text: "[2,7,11,15], target 9 → [0,1]",
          note: "2 + 7 = 9",
        },
        {
          text: "[3,2,4], target 6 → [1,2]",
          note: "not [0,0]: 3 can't use itself",
        },
      ],
    },
    how: {
      insight: "Key insight: for each num, the partner you need is target − num. Keep a map of value → index for everything you've seen, and check the map before inserting the current number.",
    },
    pitfalls: [
      "Inserting before checking — with [3,2,4] and target 6, the 3 matches itself and you return [0,0].",
      "Returning the values instead of their indices.",
    ],
  },
  complexity: { time: "O(n)", space: "O(n)" },
  language: "python",
  code,
  inputs: [
    { name: "nums", label: "nums", type: "json", placeholder: "[2,7,11,15]" },
    { name: "target", label: "target", type: "json", placeholder: "9" },
  ],
  presets: [
    { label: "Example 1", values: { nums: "[2,7,11,15]", target: "9" } },
    { label: "Example 2", values: { nums: "[3,2,4]", target: "6" } },
    { label: "Late match", values: { nums: "[1,5,8,3,9,4,6]", target: "10" } },
  ],
  trace(input) {
    const nums = expectIntArray(input.nums, "nums");
    const target = expectInt(input.target, "target");
    const t = new Tracer();
    const seen = new Map<number, number>();

    const snapshot = (
      vars: Record<string, number | string | null>,
      opts: { i?: number; tones?: Record<number, "active" | "found" | "compare">; mapTone?: Record<string, "found" | "active">; changed?: string[] } = {},
    ): Viz[] => [
      {
        kind: "array",
        id: "nums",
        label: "nums",
        values: nums,
        pointers: opts.i === undefined ? [] : [{ name: "i", index: opts.i, tone: "active" }],
        tones: opts.tones,
      },
      {
        kind: "map",
        id: "seen",
        label: "seen  (value → index)",
        entries: [...seen.entries()],
        tones: opts.mapTone,
      },
      { kind: "vars", id: "vars", label: "variables", vars: { target, ...vars }, changed: opts.changed },
    ];

    t.step(3, "Start with an empty map of numbers we've already seen.", snapshot({}));
    for (let i = 0; i < nums.length; i++) {
      const num = nums[i];
      t.step(4, `Look at nums[${i}] = ${num}.`, snapshot({ i, num }, { i, tones: { [i]: "active" }, changed: ["i", "num"] }));
      const need = target - num;
      t.step(5, `We need ${target} − ${num} = ${need} to reach the target.`, snapshot({ i, num, need }, { i, tones: { [i]: "active" }, changed: ["need"] }));
      if (seen.has(need)) {
        const j = seen.get(need)!;
        t.step(6, `${need} is in the map at index ${j}.`, snapshot({ i, num, need }, { i, tones: { [i]: "active", [j]: "compare" }, mapTone: { [String(need)]: "found" } }));
        t.step(7, `Found it: nums[${j}] + nums[${i}] = ${need} + ${num} = ${target}. Return [${j}, ${i}].`, snapshot({ i, num, need, result: `[${j}, ${i}]` }, { i, tones: { [i]: "found", [j]: "found" }, mapTone: { [String(need)]: "found" }, changed: ["result"] }), true);
        return t.frames;
      }
      t.step(6, `${need} isn't in the map yet.`, snapshot({ i, num, need }, { i, tones: { [i]: "active" } }));
      seen.set(num, i);
      t.step(8, `Store ${num} → ${i} so later numbers can pair with it.`, snapshot({ i, num, need }, { i, tones: { [i]: "active" }, mapTone: { [String(num)]: "active" } }));
    }
    t.step(9, "No pair adds up to the target. Return [].", snapshot({ result: "[]" }, { changed: ["result"] }), true);
    return t.frames;
  },
};
