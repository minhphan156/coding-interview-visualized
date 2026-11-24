import { Tracer, expectInt, expectTimestamps } from "@/lib/viz/tracer";
import type { Primitive, Problem, Tone, Viz } from "@/lib/viz/types";

const code = `class TokenBucket {
    private tokens: number;
    private last = 0;
    constructor(private capacity: number, private refillPerSec: number) {
        this.tokens = capacity;
    }
    allow(now: number): boolean {
        const refill = (now - this.last) * this.refillPerSec;
        this.tokens = Math.min(this.capacity, this.tokens + refill);
        this.last = now;
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}`;

const round = (x: number) => Math.round(x * 1e6) / 1e6;
const fmt = (x: number) => String(Math.round(x * 100) / 100);

export const tokenBucketRateLimiter: Problem = {
  slug: "token-bucket-rate-limiter",
  title: "Token Bucket Rate Limiter",
  difficulty: "Medium",
  pattern: "Token bucket (lazy refill)",
  tags: ["System Design", "Rate Limiting", "Design"],
  description: [
    "Design a rate limiter that allows short bursts of traffic but caps the long-run request rate.",
    "The limiter is a bucket that holds at most capacity tokens and starts full. Tokens are added at refillPerSec tokens per second, and anything above capacity is discarded.",
    "Implement allow(now), called with the time in seconds of each incoming request (in non-decreasing order). If the bucket has at least one token, take one and return true. Otherwise return false.",
  ],
  examples: [
    {
      input: "const limiter = new TokenBucket(3, 1);\n[0, 0, 0, 0, 1].map((t) => limiter.allow(t));",
      output: "[true, true, true, false, true]",
      explanation:
        "t=0: the full bucket pays for 3 requests (3 → 0 tokens).\nt=0: the 4th request finds 0 tokens and is rejected.\nt=1: one second refilled 1 token, so it's allowed.",
    },
  ],
  constraints: ["1 <= capacity <= 10", "0 < refillPerSec <= 10", "Timestamps are non-decreasing."],
  keyIdeas: [
    "The bucket size is the biggest burst you allow. The refill rate is the sustained throughput.",
    "Don't run a timer that adds tokens every tick. Refill lazily: when a request arrives, compute how many tokens dripped in since the last request, (now − last) × rate.",
    "Cap the bucket at capacity. A user who was idle for an hour still only gets capacity tokens, not an hour's worth.",
    "If there's at least one token, spend it and allow the request. Otherwise reject it.",
    "State per user is just two numbers, tokens and last, so it's cheap to store in memory or Redis.",
  ],
  guide: {
    why: {
      intro: "This is the most common rate limiter in real APIs (AWS, Stripe and many gateways use it). It tests:",
      points: [
        "Can you separate burst size from the average rate?",
        "Can you avoid a background timer by computing state lazily from timestamps?",
        "Can you handle the cap, so idle time doesn't turn into unlimited credit?",
      ],
      analogy:
        "Think of a jar on a coffee counter that holds at most 10 tokens. A barista drops in a new token every few seconds, and once the jar is full extra tokens fall on the floor. Every order costs one token. If you've been away, the jar is full and you can order 10 at once, but after that you're limited to the drip rate. A phone plan with rollover data works the same way.",
    },
    what: {
      summary: "Allow a request if the bucket has a token (spending it), refilling at a fixed rate up to a cap.",
      examples: [
        { text: "capacity 3, rate 1: [0,0,0,0,1] → [✓,✓,✓,✗,✓]", note: "burst of 3, then 1 per second" },
      ],
    },
    how: {
      insight:
        "Key insight: refill on demand. On each call, add (now − last) × rate tokens, clamp to capacity, and update last. Then spend one token if you have it.",
    },
    pitfalls: [
      "Forgetting the Math.min cap — a user idle for a day would bank a day of tokens and could flood you.",
      "Not updating last after a refill — the same elapsed time gets counted again on the next request.",
      "Checking tokens > 0 instead of tokens >= 1 — with a fractional refill rate, 0.5 tokens is not enough to pay for a request.",
      "Compared with a sliding window: the token bucket intentionally allows bursts. If you need a hard cap over every rolling interval, use a sliding window instead.",
    ],
  },
  complexity: { time: "O(1) per request", space: "O(1) per user" },
  language: "typescript",
  code,
  inputs: [
    { name: "capacity", label: "capacity", type: "json", placeholder: "3" },
    { name: "refillPerSec", label: "refillPerSec", type: "json", placeholder: "1" },
    { name: "times", label: "request times (seconds)", type: "json", placeholder: "[0,0,0,0,1,3,3,3,3]" },
  ],
  presets: [
    { label: "Burst then wait", values: { capacity: "3", refillPerSec: "1", times: "[0,0,0,0,1,3,3,3,3]" } },
    { label: "Slow refill", values: { capacity: "4", refillPerSec: "0.5", times: "[0,0,1,2,2,4,6,6,6]" } },
    { label: "Steady traffic", values: { capacity: "2", refillPerSec: "1", times: "[0,1,2,3,4,5]" } },
  ],
  trace(input) {
    const capacity = expectInt(input.capacity, "capacity");
    if (capacity < 1 || capacity > 10) throw new Error("capacity must be between 1 and 10 so the bucket fits.");
    const rate = input.refillPerSec;
    if (typeof rate !== "number" || !(rate > 0) || rate > 10) {
      throw new Error("refillPerSec must be a number greater than 0 and at most 10, e.g. 1 or 0.5.");
    }
    const times = expectTimestamps(input.times);
    const t = new Tracer();
    let tokens = capacity;
    let last = 0;
    const results: (boolean | undefined)[] = times.map(() => undefined);

    const snapshot = (
      current: number | undefined,
      opts: { bucket?: Record<number, Tone>; vars?: Record<string, Primitive>; changed?: string[]; done?: boolean } = {},
    ): Viz[] => {
      const whole = Math.floor(tokens);
      const frac = round(tokens - whole);
      const cells: Primitive[] = Array.from({ length: capacity }, (_, k) =>
        k < whole ? "●" : k === whole && frac > 0 ? fmt(frac) : "",
      );
      const bucketTones: Record<number, Tone> = {};
      for (let k = 0; k < capacity; k++) {
        bucketTones[k] = k < whole ? "visited" : k === whole && frac > 0 ? "compare" : "muted";
      }
      Object.assign(bucketTones, opts.bucket);

      const reqTones: Record<number, Tone> = {};
      const resultTones: Record<number, Tone> = {};
      results.forEach((r, i) => {
        if (r === undefined) return;
        reqTones[i] = r ? "visited" : "error";
        resultTones[i] = r ? (opts.done ? "found" : "visited") : "error";
      });
      if (current !== undefined) reqTones[current] = "active";

      return [
        {
          kind: "array",
          id: "requests",
          label: "request times (seconds)",
          values: times,
          tones: reqTones,
          pointers: current !== undefined ? [{ name: "now", index: current, tone: "active" }] : [],
        },
        {
          kind: "array",
          id: "results",
          label: "allow() returned",
          values: results.map((r) => (r === undefined ? "" : r ? "✓" : "✗")),
          tones: resultTones,
        },
        {
          kind: "array",
          id: "bucket",
          label: `bucket  (${fmt(tokens)} / ${capacity} tokens)`,
          values: cells,
          tones: bucketTones,
        },
        {
          kind: "vars",
          id: "vars",
          label: "variables",
          vars: { capacity, refillPerSec: rate, tokens: fmt(tokens), last, ...opts.vars },
          changed: opts.changed,
        },
      ];
    };

    t.step(
      5,
      `Create a bucket with capacity ${capacity}, refilling ${rate} token${rate === 1 ? "" : "s"} per second. It starts full, with ${capacity} tokens.`,
      snapshot(undefined, { changed: ["tokens"] }),
    );

    times.forEach((now, i) => {
      t.step(7, `Request ${i} arrives at t = ${now}. Call allow(${now}).`, snapshot(i, { vars: { now }, changed: ["now"] }));

      const refill = round((now - last) * rate);
      t.step(
        8,
        now === last
          ? `No time has passed since the last request (t = ${last}), so refill = 0.`
          : `${now - last}s have passed since t = ${last}. refill = ${now - last} × ${rate} = ${fmt(refill)} token${refill === 1 ? "" : "s"}.`,
        snapshot(i, { vars: { now, refill: fmt(refill) }, changed: ["refill"] }),
      );

      const before = tokens;
      const uncapped = round(tokens + refill);
      tokens = Math.min(capacity, uncapped);
      const added: Record<number, Tone> = {};
      for (let k = Math.floor(before); k < Math.ceil(tokens); k++) added[k] = "active";
      t.step(
        9,
        uncapped > capacity
          ? `${fmt(before)} + ${fmt(refill)} = ${fmt(uncapped)} is more than the capacity, so the bucket fills to ${capacity} and the extra ${fmt(uncapped - capacity)} spills over.`
          : refill > 0
            ? `tokens = ${fmt(before)} + ${fmt(refill)} = ${fmt(tokens)}.`
            : `tokens stays at ${fmt(tokens)}.`,
        snapshot(i, { bucket: added, vars: { now, refill: fmt(refill) }, changed: tokens !== before ? ["tokens"] : [] }),
      );

      last = now;
      t.step(10, `Remember last = ${now}, so the next refill only counts time after this request.`, snapshot(i, { vars: { now }, changed: ["last"] }));

      const enough = tokens >= 1;
      t.step(
        11,
        enough ? `${fmt(tokens)} ≥ 1, so there's a token to spend.` : `${fmt(tokens)} < 1, so the bucket can't pay for this request.`,
        snapshot(i, { vars: { now } }),
      );

      if (enough) {
        tokens = round(tokens - 1);
        t.step(12, `Spend one token: tokens = ${fmt(tokens)}.`, snapshot(i, { bucket: { [Math.floor(tokens)]: "error" }, vars: { now }, changed: ["tokens"] }));
        results[i] = true;
        t.step(13, `Return true: request ${i} at t = ${now} is allowed.`, snapshot(i, { vars: { now } }));
      } else {
        results[i] = false;
        t.step(15, `Return false: request ${i} at t = ${now} is rejected.`, snapshot(i, { vars: { now } }));
      }
    });

    const allowed = results.filter(Boolean).length;
    t.step(
      17,
      `Done: ${allowed} of ${times.length} requests were allowed and ${times.length - allowed} were rejected.`,
      snapshot(undefined, { vars: { allowed }, changed: ["allowed"], done: true }),
      true,
    );
    return t.frames;
  },
};
