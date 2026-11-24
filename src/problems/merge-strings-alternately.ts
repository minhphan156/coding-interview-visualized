import { Tracer, expectString } from "@/lib/viz/tracer";
import type { Problem, Tone, Viz } from "@/lib/viz/types";

const code = `function mergeAlternately(word1: string, word2: string): string {
    let result = "";
    const n = Math.max(word1.length, word2.length);
    for (let i = 0; i < n; i++) {
        if (i < word1.length) result += word1[i];
        if (i < word2.length) result += word2[i];
    }
    return result;
}`;

function expectWord(value: unknown, name: string): string {
  const word = expectString(value, name, 16);
  if (!/^[a-z]+$/.test(word)) {
    throw new Error(`${name} must be 1–16 lowercase letters, e.g. abc.`);
  }
  return word;
}

export const mergeStringsAlternately: Problem = {
  slug: "merge-strings-alternately",
  number: 1768,
  title: "Merge Strings Alternately",
  difficulty: "Easy",
  url: "https://leetcode.com/problems/merge-strings-alternately/",
  pattern: "Two pointers (walk both strings)",
  tags: ["Two Pointers", "String"],
  description: [
    "You are given two strings word1 and word2. Merge the strings by adding letters in alternating order, starting with word1. If a string is longer than the other, append the additional letters onto the end of the merged string.",
    "Return the merged string.",
  ],
  examples: [
    {
      input: 'const word1: string = "abc";\nconst word2: string = "pqr";',
      output: '"apbqcr"',
      explanation:
        "The merged string will be merged as so:\nword1:  a   b   c\nword2:    p   q   r\nmerged: a p b q c r",
    },
    {
      input: 'const word1: string = "ab";\nconst word2: string = "pqrs";',
      output: '"apbqrs"',
      explanation:
        'Notice that as word2 is longer, "rs" is appended to the end.\nword1:  a   b \nword2:    p   q   r   s\nmerged: a p b q   r   s',
    },
    {
      input: 'const word1: string = "abcd";\nconst word2: string = "pq";',
      output: '"apbqcd"',
      explanation:
        'Notice that as word1 is longer, "cd" is appended to the end.\nword1:  a   b   c   d\nword2:    p   q \nmerged: a p b q c   d',
    },
  ],
  constraints: [
    "1 <= word1.length, word2.length <= 100",
    "word1 and word2 consist of lowercase English letters.",
  ],
  keyIdeas: [
    "Walk one index i from 0 up to the length of the longer word.",
    "At each i, take word1[i] first, then word2[i]. That gives the alternating order.",
    "Guard each take with a bounds check (i < length). Once the shorter word runs out, its check fails and the longer word's leftovers are appended automatically.",
    "No special case is needed for the tail: the loop over max(len1, len2) handles it.",
  ],
  complexity: { time: "O(m + n)", space: "O(m + n) for the output" },
  language: "typescript",
  code,
  inputs: [
    { name: "word1", label: "word1", type: "string", placeholder: "abc" },
    { name: "word2", label: "word2", type: "string", placeholder: "pqr" },
  ],
  presets: [
    { label: "Example 1", values: { word1: "abc", word2: "pqr" } },
    { label: "Example 2", values: { word1: "ab", word2: "pqrs" } },
    { label: "Example 3", values: { word1: "abcd", word2: "pq" } },
  ],
  trace(input) {
    const word1 = expectWord(input.word1, "word1");
    const word2 = expectWord(input.word2, "word2");
    const t = new Tracer();
    const n = Math.max(word1.length, word2.length);
    const result: string[] = [];
    const sources: Tone[] = [];

    const snapshot = (
      i: number | undefined,
      opts: { t1?: Tone; t2?: Tone; newest?: boolean; changed?: string[]; resultDone?: boolean } = {},
    ): Viz[] => {
      const used = (len: number) => {
        const tones: Record<number, Tone> = {};
        for (let k = 0; k < len && i !== undefined && k < i; k++) tones[k] = "muted";
        if (i === undefined && opts.resultDone) for (let k = 0; k < len; k++) tones[k] = "muted";
        return tones;
      };
      const tones1 = used(word1.length);
      const tones2 = used(word2.length);
      if (i !== undefined && opts.t1 && i < word1.length) tones1[i] = opts.t1;
      if (i !== undefined && opts.t2 && i < word2.length) tones2[i] = opts.t2;
      const resultTones: Record<number, Tone> = {};
      sources.forEach((s, k) => (resultTones[k] = s));
      if (opts.newest && result.length) resultTones[result.length - 1] = "active";
      if (opts.resultDone) result.forEach((_, k) => (resultTones[k] = "found"));
      const inRange = i !== undefined && i < n;
      return [
        {
          kind: "array",
          id: "word1",
          label: `word1  (length ${word1.length})`,
          values: [...word1],
          tones: tones1,
          pointers: inRange && i < word1.length ? [{ name: "i", index: i, tone: "active" }] : [],
        },
        {
          kind: "array",
          id: "word2",
          label: `word2  (length ${word2.length})`,
          values: [...word2],
          tones: tones2,
          pointers: inRange && i < word2.length ? [{ name: "i", index: i, tone: "compare" }] : [],
        },
        { kind: "array", id: "result", label: "result", values: [...result], tones: resultTones },
        {
          kind: "vars",
          id: "vars",
          label: "variables",
          vars: { n, ...(i !== undefined ? { i } : {}), result: `"${result.join("")}"` },
          changed: opts.changed,
        },
      ];
    };

    t.step(2, "Start with an empty result string.", snapshot(undefined, { changed: ["result"] }));
    t.step(3, `n = max(${word1.length}, ${word2.length}) = ${n}. We need ${n} rounds to cover the longer word.`, snapshot(undefined, { changed: ["n"] }));
    for (let i = 0; i < n; i++) {
      t.step(4, `Round i = ${i}.`, snapshot(i, { changed: ["i"] }));
      if (i < word1.length) {
        result.push(word1[i]);
        sources.push("visited");
        t.step(5, `i < ${word1.length}, so append word1[${i}] = '${word1[i]}'.`, snapshot(i, { t1: "found", newest: true, changed: ["result"] }));
      } else {
        t.step(5, `word1 has no index ${i}, so skip it.`, snapshot(i, {}));
      }
      if (i < word2.length) {
        result.push(word2[i]);
        sources.push("compare");
        t.step(6, `i < ${word2.length}, so append word2[${i}] = '${word2[i]}'.`, snapshot(i, { t2: "found", newest: true, changed: ["result"] }));
      } else {
        t.step(6, `word2 has no index ${i}, so skip it. Only word1's leftovers remain.`, snapshot(i, {}));
      }
    }
    t.step(4, `i = ${n} reaches n, so the loop ends.`, snapshot(n, { changed: ["i"] }));
    t.step(8, `Return "${result.join("")}".`, snapshot(undefined, { resultDone: true }), true);
    return t.frames;
  },
};
