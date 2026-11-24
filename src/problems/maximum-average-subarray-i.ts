import { Tracer, expectInt, expectIntArray } from "@/lib/viz/tracer";
import type { Problem, Tone, Viz } from "@/lib/viz/types";

const code = `function findMaxAverage(nums: number[], k: number): number {
    let sum = 0;
    for (let i = 0; i < k; i++) sum += nums[i];
    let best = sum;
    for (let i = k; i < nums.length; i++) {
        sum += nums[i] - nums[i - k];
        best = Math.max(best, sum);
    }
    return best / k;
}`;

const fmt = (x: number) => x.toFixed(5);

export const maximumAverageSubarrayI: Problem = {
  slug: "maximum-average-subarray-i",
  number: 643,
  title: "Maximum Average Subarray I",
  difficulty: "Easy",
  pattern: "Fixed-size sliding window",
  tags: ["Array", "Sliding Window"],
  description: [
    "You are given an integer array nums consisting of n elements, and an integer k.",
    "Find a contiguous subarray whose length is equal to k that has the maximum average value and return this value. Any answer with a calculation error less than 10⁻⁵ will be accepted.",
  ],
  examples: [
    {
      input: "const nums: number[] = [1, 12, -5, -6, 50, 3];\nconst k: number = 4;",
      output: "12.75000",
      explanation: "Maximum average is (12 - 5 - 6 + 50) / 4 = 51 / 4 = 12.75",
    },
    { input: "const nums: number[] = [5];\nconst k: number = 1;", output: "5.00000" },
  ],
  constraints: ["n == nums.length", "1 <= k <= n <= 10⁵", "-10⁴ <= nums[i] <= 10⁴"],
  keyIdeas: [
    "Every window has the same length k, so the biggest average is just the biggest sum. Divide by k once, at the end.",
    "Sum the first k numbers to get the first window.",
    "Slide right one step at a time: add the number entering on the right and subtract the one leaving on the left.",
    "Track the best sum seen. Each slide is O(1), so the whole scan is O(n) instead of re-adding k numbers per window.",
  ],
  guide: {
    why: {
      intro: "This is the foundation for the fixed-size Sliding Window pattern. It tests:",
      points: [
        "Can you spot repeated work? Neighboring windows share k − 1 numbers.",
        "Can you update a running sum in O(1) instead of recomputing it?",
        "Can you simplify the goal? With a fixed k, max average = max sum ÷ k.",
      ],
      analogy: "Think of a train window frame sliding along the track: one sight enters on the right as one leaves on the left.",
    },
    what: {
      summary: "Of all the length-k runs of consecutive numbers, return the largest average.",
      examples: [
        { text: "[1,12,-5,-6,50,3], k = 4 → 12.75", note: "window [12,-5,-6,50], sum 51 / 4" },
        { text: "[5], k = 1 → 5", note: "only one window" },
      ],
    },
    how: {
      insight:
        "Key insight: don't re-add the whole window each time. Build the first window's sum, then slide: sum += nums[i] − nums[i − k]. Keep the best sum and divide by k once at the end.",
    },
    pitfalls: [
      "Starting best at 0 — if every number is negative, the real best sum is negative and you'd wrongly return 0. Start best at the first window's sum.",
      "Recomputing each window's sum with an inner loop — that's O(n · k) and times out when n = 10⁵.",
      "Off-by-one on the leaving index — the number that leaves when i enters is nums[i − k], not nums[i − k + 1].",
    ],
  },
  complexity: { time: "O(n)", space: "O(1)" },
  language: "typescript",
  code,
  inputs: [
    { name: "nums", label: "nums", type: "json", placeholder: "[1,12,-5,-6,50,3]" },
    { name: "k", label: "k", type: "json", placeholder: "4" },
  ],
  presets: [
    { label: "Example 1", values: { nums: "[1,12,-5,-6,50,3]", k: "4" } },
    { label: "Example 2", values: { nums: "[5]", k: "1" } },
    { label: "All negative", values: { nums: "[-3,-8,-1,-6,-2,-9]", k: "2" } },
  ],
  trace(input) {
    const nums = expectIntArray(input.nums, "nums", 20);
    const k = expectInt(input.k, "k");
    if (k < 1 || k > nums.length) throw new Error(`k must be between 1 and ${nums.length} (the length of nums).`);
    if (nums.some((v) => Math.abs(v) > 999)) throw new Error("Use values between -999 and 999 so the cells fit.");
    const t = new Tracer();
    let sum = 0;
    let best = 0;
    let bestStart = 0;

    const snapshot = (
      left: number,
      right: number,
      opts: { extra?: Record<number, Tone>; vars?: Record<string, number | string>; changed?: string[]; done?: boolean } = {},
    ): Viz[] => {
      const tones: Record<number, Tone> = {};
      if (opts.done) {
        for (let j = bestStart; j < bestStart + k; j++) tones[j] = "found";
      } else {
        for (let j = left; j <= right; j++) tones[j] = "compare";
      }
      Object.assign(tones, opts.extra);
      const pointers = opts.done || right < 0 ? [] : [{ name: "L", index: left, tone: "active" as Tone }, { name: "R", index: right, tone: "compare" as Tone }];
      return [
        {
          kind: "array",
          id: "nums",
          label: `nums  (window size k = ${k})`,
          values: nums,
          tones,
          pointers,
        },
        { kind: "vars", id: "vars", label: "variables", vars: { k, sum, ...opts.vars }, changed: opts.changed },
      ];
    };

    t.step(2, "Start with sum = 0.", snapshot(0, -1, { changed: ["sum"] }));
    for (let i = 0; i < k; i++) {
      sum += nums[i];
      t.step(3, `Build the first window: add nums[${i}] = ${nums[i]}, so sum = ${sum}.`, snapshot(0, i, { extra: { [i]: "active" }, changed: ["sum"] }));
    }
    best = sum;
    t.step(4, `The first window [0..${k - 1}] sums to ${sum}. That's the best so far.`, snapshot(0, k - 1, { vars: { best }, changed: ["best"] }));

    for (let i = k; i < nums.length; i++) {
      const left = i - k + 1;
      t.step(5, `Slide the window one step right, to [${left}..${i}].`, snapshot(left, i, { extra: { [i]: "active", [i - k]: "error" }, vars: { best, i } , changed: ["i"] }));
      const before = sum;
      sum += nums[i] - nums[i - k];
      t.step(
        6,
        `${nums[i]} enters and ${nums[i - k]} leaves: sum = ${before} + ${nums[i]} − ${nums[i - k] < 0 ? `(${nums[i - k]})` : nums[i - k]} = ${sum}.`,
        snapshot(left, i, { extra: { [i]: "active", [i - k]: "muted" }, vars: { best, i }, changed: ["sum"] }),
      );
      const improved = sum > best;
      if (improved) {
        best = sum;
        bestStart = left;
      }
      t.step(
        7,
        improved ? `${sum} beats the old best, so best = ${best}.` : `${sum} doesn't beat best = ${best}.`,
        snapshot(left, i, { extra: improved ? Object.fromEntries(Array.from({ length: k }, (_, j) => [left + j, "found" as Tone])) : {}, vars: { best, i }, changed: improved ? ["best"] : [] }),
      );
    }
    if (nums.length > k) {
      t.step(5, `i = ${nums.length} reaches the end, so the window can't slide any further.`, snapshot(nums.length - k, nums.length - 1, { vars: { best } }));
    }
    t.step(
      9,
      `The best window is [${bestStart}..${bestStart + k - 1}] with sum ${best}. Return ${best} / ${k} = ${fmt(best / k)}.`,
      snapshot(0, -1, { vars: { best, average: fmt(best / k) }, changed: ["average"], done: true }),
      true,
    );
    return t.frames;
  },
};
