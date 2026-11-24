import { Tracer, expectIntArray } from "@/lib/viz/tracer";
import type { Problem, Tone, Viz } from "@/lib/viz/types";

const code = `function moveZeroes(nums: number[]): void {
    let write = 0;
    for (let read = 0; read < nums.length; read++) {
        if (nums[read] !== 0) {
            [nums[write], nums[read]] = [nums[read], nums[write]];
            write++;
        }
    }
}`;

export const moveZeroes: Problem = {
  slug: "move-zeroes",
  number: 283,
  title: "Move Zeroes",
  difficulty: "Easy",
  pattern: "Two pointers (read / write)",
  tags: ["Array", "Two Pointers"],
  description: [
    "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
    "Note that you must do this in-place without making a copy of the array.",
  ],
  examples: [
    { input: "nums = [0,1,0,3,12]", output: "[1,3,12,0,0]" },
    { input: "nums = [0]", output: "[0]" },
  ],
  constraints: ["1 <= nums.length <= 10⁴", "-2³¹ <= nums[i] <= 2³¹ - 1"],
  followUp: "Could you minimize the total number of operations done?",
  keyIdeas: [
    "Two pointers move left to right: read visits every element, and write marks where the next non-zero belongs.",
    "Everything before write is the finished, in-order list of non-zeros. Everything from write up to read is zeros.",
    "When read finds a non-zero, swap it with nums[write] (a zero, or itself), then move write forward.",
    "Swapping instead of overwriting leaves the zeros at the end automatically, with one pass and no second fill loop.",
  ],
  guide: {
    why: {
      intro: "This is the foundation for the read/write (slow/fast) Two Pointers pattern: editing an array in place. It tests:",
      points: [
        "Can you modify an array in place with O(1) extra space?",
        "Can you keep the relative order of the non-zeros stable?",
        "Can you minimize the number of writes? (the follow-up)",
      ],
      analogy: "Think compacting a bookshelf: slide every book left to close the gaps, and the empty slots collect at the end.",
    },
    what: {
      summary: "Push every 0 to the end, keep the non-zeros in their original order, and do it in place.",
      examples: [
        {
          text: "[0,1,0,3,12] → [1,3,12,0,0]",
          note: "1, 3, 12 keep their order",
        },
        {
          text: "[0] → [0]",
          note: "nothing to move",
        },
      ],
    },
    how: {
      insight: "Key insight: read scans every element, and write marks where the next non-zero belongs. Swap each non-zero into nums[write], then write++. Because you swap instead of overwrite, the zeros drift to the end on their own, with no second pass to fill them in.",
    },
    pitfalls: [
      "Building a new array or using filter() — the problem requires in-place.",
      "Using splice() inside the loop to remove zeros — that's O(n²) and shifts indices under you, so you skip elements.",
      "Overwriting nums[write] = nums[read] without a swap and then forgetting to fill the tail with 0s.",
    ],
  },
  complexity: { time: "O(n)", space: "O(1)" },
  language: "typescript",
  code,
  inputs: [{ name: "nums", label: "nums", type: "json", placeholder: "[0,1,0,3,12]" }],
  presets: [
    { label: "Example 1", values: { nums: "[0,1,0,3,12]" } },
    { label: "Example 2", values: { nums: "[0]" } },
    { label: "Mixed", values: { nums: "[4,0,0,-2,0,7,5,0]" } },
  ],
  trace(input) {
    const values = expectIntArray(input.nums, "nums", 16);
    if (values.some((v) => Math.abs(v) > 999)) throw new Error("Use values between -999 and 999 so the cells fit.");
    const t = new Tracer();
    const items = values.map((v, id) => ({ v, id }));
    let write = 0;

    const snapshot = (read: number | undefined, extra: Record<number, Tone> = {}, changed: string[] = [], done = false): Viz[] => {
      const tones: Record<number, Tone> = {};
      items.forEach((item, k) => {
        if (done) tones[k] = item.v === 0 ? "muted" : "found";
        else if (k < write) tones[k] = "visited";
        else if (read !== undefined && k < read && item.v === 0) tones[k] = "muted";
      });
      Object.assign(tones, extra);
      const pointers =
        done || read === undefined
          ? [{ name: "write", index: Math.min(write, items.length - 1), tone: "active" as Tone }]
          : [
              { name: "write", index: write, tone: "active" as Tone },
              ...(read < items.length ? [{ name: "read", index: read, tone: "compare" as Tone }] : []),
            ];
      return [
        { kind: "array", id: "nums", label: "nums", values: items.map((x) => x.v), ids: items.map((x) => x.id), tones, pointers: done ? [] : pointers },
        {
          kind: "vars",
          id: "vars",
          label: "variables",
          vars: { write, ...(read !== undefined ? { read } : {}), ...(done ? { nums: `[${items.map((x) => x.v).join(",")}]` } : {}) },
          changed,
        },
      ];
    };

    t.step(2, "write = 0: the next non-zero belongs at index 0.", snapshot(undefined, {}, ["write"]));
    for (let read = 0; read < items.length; read++) {
      t.step(3, `read = ${read}. Look at nums[${read}] = ${items[read].v}.`, snapshot(read, { [read]: "compare" }, ["read"]));
      if (items[read].v === 0) {
        t.step(4, `It's 0, so skip it. write stays at ${write}, saving that spot for the next non-zero.`, snapshot(read, { [read]: "muted" }));
        continue;
      }
      t.step(4, `${items[read].v} isn't 0, so it belongs at index ${write}.`, snapshot(read, { [read]: "compare", [write]: "active" }));
      if (read === write) {
        t.step(5, `read and write are both ${read}, so it swaps with itself. It's already in place.`, snapshot(read, { [read]: "found" }));
      } else {
        const moving = items[read].v;
        const zero = items[write].v;
        [items[write], items[read]] = [items[read], items[write]];
        t.step(5, `Swap: ${moving} moves left to index ${write}, and the ${zero} moves right to index ${read}.`, snapshot(read, { [write]: "found", [read]: "muted" }));
      }
      write++;
      t.step(6, `write = ${write}. Indices 0..${write - 1} now hold the non-zeros, in their original order.`, snapshot(read, {}, ["write"]));
    }
    t.step(3, `read = ${items.length} reaches the end, so the loop stops.`, snapshot(items.length, {}, ["read"]));
    t.step(
      9,
      `Done in place: [${items.map((x) => x.v).join(",")}]. ${
        items.length === write
          ? "There were no zeros to move."
          : `The ${items.length - write === 1 ? "zero is" : `${items.length - write} zeros are`} at the end.`
      }`,
      snapshot(undefined, {}, ["nums"], true),
      true,
    );
    return t.frames;
  },
};
