import { Tracer, expectString } from "@/lib/viz/tracer";
import type { Problem, Tone, Viz } from "@/lib/viz/types";

const code = `class Solution:
    def isValid(self, s: str) -> bool:
        pairs = {")": "(", "]": "[", "}": "{"}
        stack = []
        for ch in s:
            if ch in pairs:
                if not stack or stack[-1] != pairs[ch]:
                    return False
                stack.pop()
            else:
                stack.append(ch)
        return not stack`;

const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

export const validParentheses: Problem = {
  slug: "valid-parentheses",
  number: 20,
  title: "Valid Parentheses",
  difficulty: "Easy",
  pattern: "Stack matching",
  tags: ["String", "Stack"],
  description: [
    "Given a string s containing only the characters ( ) { } [ ], decide whether it is valid.",
    "A string is valid when every open bracket is closed by the same type of bracket, in the correct order.",
  ],
  keyIdeas: [
    "The most recently opened bracket must be the first one closed, which is last in, first out, so use a stack.",
    "Push every opening bracket.",
    "On a closing bracket, the top of the stack must be its partner. Otherwise the string is invalid.",
    "At the end, leftover openers mean the string is invalid.",
  ],
  guide: {
    why: {
      intro: "This is the foundation for the Stack pattern. It tests:",
      points: [
        "Can you recognize last-opened, first-closed (LIFO) order?",
        "Can you handle three bracket types with one lookup map?",
        "Can you catch every failure: the wrong type, a closer with nothing open, and leftover openers?",
      ],
      analogy: "Think nesting boxes: you have to close the innermost box before the one around it.",
    },
    what: {
      summary: "Decide whether every bracket is closed by the same type, in the right order.",
      examples: [
        {
          text: "{[()()]} → true",
        },
        {
          text: "([)] → false",
          note: "] arrives while ( is still open",
        },
        {
          text: "(([] → false",
          note: "two ( are never closed",
        },
      ],
    },
    how: {
      insight: "Key insight: push every opener. On a closer, the top of the stack must be its partner, so pop it, or fail immediately. At the end, the stack must be empty.",
    },
    pitfalls: [
      "Skipping the final empty-stack check — \"((\" would wrongly pass.",
      "Reading the top of an empty stack — a string starting with \")\" must return false, not crash.",
    ],
  },
  complexity: { time: "O(n)", space: "O(n)" },
  language: "python",
  code,
  inputs: [{ name: "s", label: "s", type: "string", placeholder: "([]{})" }],
  presets: [
    { label: "Valid nesting", values: { s: "{[()()]}" } },
    { label: "Wrong order", values: { s: "([)]" } },
    { label: "Unclosed", values: { s: "(([]" } },
  ],
  trace(input) {
    const s = expectString(input.s, "s", 30);
    if (![...s].every((c) => "()[]{}".includes(c))) {
      throw new Error("s may only contain the characters ( ) [ ] { }.");
    }
    const t = new Tracer();
    const stack: string[] = [];
    const chars = [...s];

    const snapshot = (i: number | undefined, tones: Record<number, Tone>, topTone?: Tone, vars: Record<string, string | boolean> = {}): Viz[] => [
      { kind: "array", id: "s", label: "s", values: chars, pointers: i === undefined ? [] : [{ name: "ch", index: i, tone: "active" }], tones },
      { kind: "stack", id: "stack", label: "stack", items: [...stack], topTone },
      { kind: "vars", id: "vars", label: "variables", vars, changed: Object.keys(vars).filter((k) => k === "result") },
    ];

    const doneTones: Record<number, Tone> = {};
    t.step(3, "Map each closing bracket to the opening bracket it needs.", snapshot(undefined, {}));
    t.step(4, "Start with an empty stack of unmatched openers.", snapshot(undefined, {}));
    if (chars.length === 0) {
      t.step(12, "The string is empty, so it's trivially valid.", snapshot(undefined, {}, undefined, { result: true }), true);
      return t.frames;
    }
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      t.step(5, `Read '${ch}'.`, snapshot(i, { ...doneTones, [i]: "active" }, undefined, { ch }));
      if (ch in pairs) {
        t.step(6, `'${ch}' is a closing bracket. It needs '${pairs[ch]}' on top of the stack.`, snapshot(i, { ...doneTones, [i]: "active" }, stack.length ? "compare" : undefined, { ch }));
        const top = stack[stack.length - 1];
        if (!stack.length || top !== pairs[ch]) {
          const why = !stack.length ? "the stack is empty" : `the top is '${top}', not '${pairs[ch]}'`;
          t.step(7, `Mismatch: ${why}.`, snapshot(i, { ...doneTones, [i]: "error" }, stack.length ? "error" : undefined, { ch }));
          t.step(8, "Return False.", snapshot(i, { ...doneTones, [i]: "error" }, stack.length ? "error" : undefined, { ch, result: false }), true);
          return t.frames;
        }
        t.step(7, `The top '${top}' matches '${ch}'.`, snapshot(i, { ...doneTones, [i]: "found" }, "found", { ch }));
        stack.pop();
        doneTones[i] = "muted";
        t.step(9, `Pop '${top}'. This pair is closed.`, snapshot(i, { ...doneTones, [i]: "found" }, undefined, { ch }));
      } else {
        t.step(10, `'${ch}' is an opening bracket.`, snapshot(i, { ...doneTones, [i]: "active" }, undefined, { ch }));
        stack.push(ch);
        doneTones[i] = "muted";
        t.step(11, `Push '${ch}' and wait for its partner.`, snapshot(i, { ...doneTones, [i]: "active" }, "active", { ch }));
      }
    }
    const ok = stack.length === 0;
    t.step(
      12,
      ok ? "The stack is empty, so every bracket was matched. Return True." : `${stack.length} opener(s) were never closed. Return False.`,
      snapshot(undefined, doneTones, ok ? undefined : "error", { result: ok }),
      true,
    );
    return t.frames;
  },
};
