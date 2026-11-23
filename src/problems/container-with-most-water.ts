import { Tracer, expectIntArray } from "@/lib/viz/tracer";
import type { Problem, Tone, Viz } from "@/lib/viz/types";

const code = `class Solution:
    def maxArea(self, height: List[int]) -> int:
        left, right = 0, len(height) - 1
        best = 0
        while left < right:
            area = (right - left) * min(height[left], height[right])
            best = max(best, area)
            if height[left] < height[right]:
                left += 1
            else:
                right -= 1
        return best`;

export const containerWithMostWater: Problem = {
  slug: "container-with-most-water",
  number: 11,
  title: "Container With Most Water",
  difficulty: "Medium",
  url: "https://leetcode.com/problems/container-with-most-water/",
  pattern: "Two pointers (shrink from both ends)",
  tags: ["Array", "Two Pointers", "Greedy"],
  description: [
    "You are given n vertical lines, where line i has height height[i].",
    "Pick two lines that, together with the x-axis, form a container holding the most water, and return that maximum amount.",
  ],
  keyIdeas: [
    "Start with the widest container: one pointer at each end.",
    "Water level = the shorter line, so area = width × min(height[left], height[right]).",
    "Moving the taller line can never help: width shrinks and the level is still capped by the shorter line.",
    "So always move the shorter side inward and hope for a taller line.",
  ],
  complexity: { time: "O(n)", space: "O(1)" },
  language: "python",
  code,
  inputs: [{ name: "height", label: "height", type: "json", placeholder: "[1,8,6,2,5,4,8,3,7]" }],
  presets: [
    { label: "Example 1", values: { height: "[1,8,6,2,5,4,8,3,7]" } },
    { label: "Tall edges", values: { height: "[9,2,3,1,4,2,8]" } },
    { label: "Increasing", values: { height: "[1,2,3,4,5,6]" } },
  ],
  trace(input) {
    const height = expectIntArray(input.height, "height", 24);
    if (height.length < 2) throw new Error("height needs at least 2 lines.");
    if (height.some((h) => h < 0 || h > 50)) throw new Error("Use heights between 0 and 50 so the bars fit.");
    const t = new Tracer();
    let left = 0;
    let right = height.length - 1;
    let best = 0;
    let bestPair: [number, number] | null = null;

    const snapshot = (vars: Record<string, number>, changed: string[], spanTone?: Tone, tones: Record<number, Tone> = {}): Viz[] => [
      {
        kind: "array",
        id: "height",
        label: "height",
        values: height,
        display: "bars",
        pointers: left < right ? [{ name: "L", index: left, tone: "active" }, { name: "R", index: right, tone: "compare" }] : [{ name: "L", index: left, tone: "muted" }, { name: "R", index: right, tone: "muted" }],
        tones: { [left]: "active", [right]: "compare", ...tones },
        span: spanTone ? { from: left, to: right, height: Math.min(height[left], height[right]), tone: spanTone } : undefined,
      },
      { kind: "vars", id: "vars", label: "variables", vars: { left, right, ...vars, best }, changed },
    ];

    t.step(3, `Put left at index 0 and right at index ${right}, the widest possible container.`, snapshot({}, ["left", "right"]));
    t.step(4, "No water measured yet: best = 0.", snapshot({}, ["best"]));
    while (left < right) {
      t.step(5, `left (${left}) < right (${right}), so keep going.`, snapshot({}, []));
      const w = right - left;
      const h = Math.min(height[left], height[right]);
      const area = w * h;
      t.step(6, `Width ${w} × level min(${height[left]}, ${height[right]}) = ${h}, so area = ${area}.`, snapshot({ area }, ["area"], "compare"));
      const improved = area > best;
      best = Math.max(best, area);
      if (improved) bestPair = [left, right];
      t.step(7, improved ? `${area} is a new best!` : `${area} doesn't beat best = ${best}.`, snapshot({ area }, improved ? ["best"] : [], improved ? "found" : "muted"));
      const moveLeft = height[left] < height[right];
      t.step(8, moveLeft ? `height[left] = ${height[left]} is shorter, so it limits the water.` : `height[right] = ${height[right]} is shorter or equal, so it limits the water.`, snapshot({ area }, [], undefined, { [moveLeft ? left : right]: "error" }));
      if (moveLeft) {
        left += 1;
        t.step(9, "Move left inward, looking for a taller line.", snapshot({ area }, ["left"]));
      } else {
        t.step(10, "Otherwise, move the right side.", snapshot({ area }, []));
        right -= 1;
        t.step(11, "Move right inward, looking for a taller line.", snapshot({ area }, ["right"]));
      }
    }
    const tones: Record<number, Tone> = bestPair ? { [bestPair[0]]: "found", [bestPair[1]]: "found" } : {};
    t.step(12, `The pointers met. The best container holds ${best}${bestPair ? ` (lines ${bestPair[0]} and ${bestPair[1]})` : ""}.`, snapshot({}, ["best"], undefined, tones), true);
    return t.frames;
  },
};
