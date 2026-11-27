import { Tracer, expectInt } from "@/lib/viz/tracer";
import type { Primitive, Problem, Tone, Viz } from "@/lib/viz/types";

const code = `// Import only the TypeScript types (no runtime code) for a decision result and a stats summary.
import type { Decision, Stats } from "./types.js";

// A rate limiter: decides whether a client is allowed to make another request to an endpoint.
export class RateLimiter {
  // Per-client/endpoint memory. Key = "client + endpoint", value = whatever the policy needs to remember.
  private state = new Map<string, unknown>();
  // Running count of every request that was let through.
  private totalAllowed = 0;
  // Running count of every request that was blocked.
  private totalRejected = 0;

  // Create a limiter. \`strategy\` picks the algorithm and defaults to "policy_a".
  // \`private readonly\` also saves it as \`this.strategy\`, which can't be changed later.
  constructor(private readonly strategy = "policy_a") {
    // Only two strategies are supported; reject anything else.
    if (!["policy_a", "policy_b"].includes(strategy)) {
      // Fail immediately so a typo in the strategy name is caught at startup.
      throw new RangeError(\`Unknown strategy: \${strategy}\`);
    }
  }

  // Main entry point: call once per incoming request to find out if it may proceed.
  check(
    // Who is making the request (e.g. a user ID or API key).
    clientId: string,
    // What they are calling (e.g. "/login"). Each endpoint is limited separately.
    endpoint: string,
    // Policy A: maximum number of requests allowed inside the time window.
    limit: number,
    // Policy A: length of the time window in milliseconds.
    windowMs: number,
    // Policy B: maximum number of tokens the bucket can hold.
    capacity: number,
    // Policy B: how fast the bucket refills, in tokens per second.
    refillRate: number,
  ): Decision {
    // Run whichever policy was chosen in the constructor and keep its answer.
    const result =
      // Is this limiter using policy A?
      this.strategy === "policy_a"
        // Yes: use the sliding-window check (only needs limit and windowMs).
        ? this.policyA(clientId, endpoint, limit, windowMs)
        // No: use policy B (only needs capacity and refillRate).
        : this.policyB(clientId, endpoint, capacity, refillRate);
    // If the request was allowed...
    if (result.allowed) {
      // ...add one to the allowed counter.
      this.totalAllowed++;
    } else {
      // Otherwise add one to the rejected counter.
      this.totalRejected++;
    }
    // Give the decision back to the caller.
    return result;
  }

  // Policy A: "sliding window log". Remember the time of each recent request and count them.
  private policyA(
    // Who is making the request.
    clientId: string,
    // Which endpoint they are calling.
    endpoint: string,
    // Max requests allowed in the window.
    limit: number,
    // Window length in milliseconds.
    windowMs: number,
  ): Decision {
    // Build a unique key for this client+endpoint. "\\u0000" is an invisible separator
    // so ("a", "bc") and ("ab", "c") don't produce the same key.
    const key = \`\${clientId}\\u0000\${endpoint}\`;
    // Current time in milliseconds.
    const now = Date.now();
    // The earliest moment that still counts; anything before this is too old.
    const windowStart = now - windowMs;

    // Get this key's list of past request timestamps, or an empty list if it's new.
    const counted = (this.state.get(key) as number[] | undefined) ?? [];
    // Keep only the timestamps that are still inside the window.
    const countedInWindow = counted.filter((timestamp) => timestamp > windowStart);

    // If the window is already full...
    if (countedInWindow.length >= limit) {
      // Save the cleaned-up list (old timestamps dropped) without adding this request.
      this.state.set(key, countedInWindow);
      // Reject the request.
      return {
        // Not allowed.
        allowed: false,
        // No requests left right now.
        remaining: 0,
        // Time until the oldest timestamp leaves the window, which frees one slot. Never negative.
        resetAfterMs: Math.max(0, countedInWindow[0] + windowMs - now),
      };
    }

    // There's room: record this request's time.
    countedInWindow.push(now);
    // Save the updated list for next time.
    this.state.set(key, countedInWindow);
    // Allow the request.
    return {
      // Allowed.
      allowed: true,
      // How many more requests fit in the window. Never negative.
      remaining: Math.max(0, limit - countedInWindow.length),
      // Time until the oldest timestamp leaves the window. Never negative.
      resetAfterMs: Math.max(0, countedInWindow[0] + windowMs - now),
    };
  }

  // Policy B: token bucket. Each request costs one token. Tokens drip back in over time, up to \`capacity\`.
  private policyB(
    // Who is making the request.
    clientId: string,
    // Which endpoint they are calling.
    endpoint: string,
    // Most tokens this client can hold. Also the biggest burst they can send at once.
    capacity: number,
    // Tokens added per second. Idle time never banks more than \`capacity\`.
    refillRate: number,
  ): Decision {
    // Same client+endpoint key as policy A, so the two policies never share a bucket by accident
    // only because the strings line up; each limiter instance uses one strategy anyway.
    const key = \`\${clientId}\\u0000\${endpoint}\`;
    // Current time in milliseconds, same clock policy A uses.
    const now = Date.now();
    // Previous bucket, if this pair has been seen. Otherwise the bucket starts full right now.
    const stored = this.state.get(key) as { tokens: number; updatedAt: number } | undefined;
    // Tokens left at the last request. A new bucket is full.
    const tokens = stored?.tokens ?? capacity;
    // When those tokens were last calculated. A new bucket is current, so nothing has refilled yet.
    const updatedAt = stored?.updatedAt ?? now;

    // How long since the last refill, in seconds, because refillRate is tokens per second.
    const elapsedSec = (now - updatedAt) / 1000;
    // Add the tokens that dripped in, then throw away anything above capacity.
    const refilled = Math.min(capacity, tokens + elapsedSec * refillRate);

    // A request costs a whole token. A fraction left over from a slow refill is not enough.
    if (refilled < 1) {
      // Remember the partial refill so the next call doesn't count this elapsed time again.
      this.state.set(key, { tokens: refilled, updatedAt: now });
      // Milliseconds until the bucket reaches 1 token.
      // A rate of 0 never refills, so report the largest finite wait the tests accept (2^63 - 1).
      const resetAfterMs =
        refillRate > 0
          ? Math.ceil(((1 - refilled) / refillRate) * 1000)
          : 9223372036854775807;
      // Reject the request.
      return {
        // Not allowed.
        allowed: false,
        // Not even one full request is available.
        remaining: 0,
        // How long the caller should wait before retrying.
        resetAfterMs,
      };
    }

    // Spend one token on this request. The rest stays in the bucket, including any fraction.
    const afterSpend = refilled - 1;
    // Save the new balance and the time it was computed.
    this.state.set(key, { tokens: afterSpend, updatedAt: now });
    // Allow the request. resetAfterMs is 0 because the caller does not need to wait.
    return {
      // Allowed.
      allowed: true,
      // How many more requests could be served immediately. Drop any fractional token.
      remaining: Math.floor(afterSpend),
      // No wait: this request was paid for by a token already in the bucket.
      resetAfterMs: 0,
    };
  }

  // Return a summary of how the limiter has behaved so far.
  stats(): Stats {
    return {
      // Which algorithm is in use.
      strategy: this.strategy,
      // Total requests let through.
      totalAllowed: this.totalAllowed,
      // Total requests blocked.
      totalRejected: this.totalRejected,
      // Number of client+endpoint pairs being tracked. Entries are never removed,
      // so this counts every pair ever seen, not only currently active ones.
      activeKeys: this.state.size,
    };
  }
}`;

const codeLines = code.split("\n");

function lineOf(snippet: string, after = 0): number {
  const idx = codeLines.findIndex((l, i) => i >= after && l.includes(snippet));
  if (idx === -1) throw new Error(`Rate limiter code has no line containing: ${snippet}`);
  return idx + 1;
}

const L = (() => {
  const policyA = lineOf("private policyA(");
  const aIf = lineOf("if (countedInWindow.length >= limit)", policyA);
  const aPush = lineOf("countedInWindow.push(now)", aIf);
  const policyB = lineOf("private policyB(");
  const bReset = lineOf("const resetAfterMs =", policyB);
  return {
    ctor: lineOf("constructor("),
    check: lineOf("  check("),
    dispatch: lineOf('this.strategy === "policy_a"'),
    incAllowed: lineOf("this.totalAllowed++"),
    incRejected: lineOf("this.totalRejected++"),
    aKey: lineOf("const key =", policyA),
    aNow: lineOf("const now =", policyA),
    aWindowStart: lineOf("const windowStart =", policyA),
    aGet: lineOf("const counted =", policyA),
    aFilter: lineOf("const countedInWindow =", policyA),
    aIf,
    aSetRejected: lineOf("this.state.set(key, countedInWindow)", aIf),
    aResetRejected: lineOf("resetAfterMs:", aIf),
    aPush,
    aSetAllowed: lineOf("this.state.set(key, countedInWindow)", aPush),
    aRemaining: lineOf("remaining: Math.max", aPush),
    bKey: lineOf("const key =", policyB),
    bNow: lineOf("const now =", policyB),
    bStored: lineOf("const stored =", policyB),
    bTokens: lineOf("const tokens =", policyB),
    bUpdatedAt: lineOf("const updatedAt =", policyB),
    bElapsed: lineOf("const elapsedSec =", policyB),
    bRefilled: lineOf("const refilled =", policyB),
    bIf: lineOf("if (refilled < 1)", policyB),
    bSetRejected: lineOf("this.state.set(key, { tokens: refilled", policyB),
    bReset,
    bReturnRejected: lineOf("return {", bReset),
    bSpend: lineOf("const afterSpend =", policyB),
    bSetAllowed: lineOf("this.state.set(key, { tokens: afterSpend", policyB),
    bRemaining: lineOf("remaining: Math.floor", policyB),
    stats: lineOf("stats(): Stats"),
  };
})();

const NEVER_MS = 9223372036854775807;

type Strategy = "policy_a" | "policy_b";
type Request = { t: number; client: string; endpoint: string };
type Decision = { allowed: boolean; remaining: number; resetAfterMs: number };
type Bucket = { tokens: number; updatedAt: number };

const fmt = (x: number) => String(Math.round(x * 100) / 100);
const list = (xs: number[]) => `[${xs.join(", ")}]`;
const showKey = (key: string) => key.replace("\u0000", " · ");
const showReset = (ms: number) => (ms === NEVER_MS ? "2^63 − 1" : ms);

function expectStrategy(value: unknown): Strategy {
  if (value !== "policy_a" && value !== "policy_b") {
    throw new Error('strategy must be "policy_a" (sliding window) or "policy_b" (token bucket).');
  }
  return value;
}

function expectNumber(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number from ${min} to ${max}.`);
  }
  return value;
}

function expectRequests(value: unknown): Request[] {
  const example = '[[0,"alice","/v1/chat"],[100,"bob","/v1/chat"]]';
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`requests must be a non-empty list of [timeMs, "clientId", "endpoint"], e.g. ${example}.`);
  }
  if (value.length > 12) throw new Error("requests can have at most 12 items here.");
  const requests = value.map((r: unknown, i) => {
    if (
      !Array.isArray(r) ||
      r.length !== 3 ||
      !Number.isInteger(r[0]) ||
      typeof r[1] !== "string" ||
      typeof r[2] !== "string"
    ) {
      throw new Error(`requests[${i}] must look like [timeMs, "clientId", "endpoint"], e.g. [0,"alice","/v1/chat"].`);
    }
    const [t, client, endpoint] = r as [number, string, string];
    if (t < 0 || t > 999_999) throw new Error(`requests[${i}]: the time must be between 0 and 999999 ms.`);
    if (!client || client.length > 12) throw new Error(`requests[${i}]: clientId must be 1–12 characters.`);
    if (!endpoint || endpoint.length > 20) throw new Error(`requests[${i}]: endpoint must be 1–20 characters.`);
    return { t, client, endpoint };
  });
  if (requests.some((r, i) => i > 0 && r.t < requests[i - 1].t)) {
    throw new Error("Request times must be in order (non-decreasing), like requests arriving over time.");
  }
  return requests;
}

export const rateLimiter: Problem = {
  slug: "rate-limiter",
  title: "Rate Limiter",
  difficulty: "Easy",
  pattern: "Hash map of per-key state (sliding window log + token bucket)",
  tags: ["System Design", "Rate Limiting", "Hash Map", "Sliding Window"],
  description: [
    "Build an in-memory rate limiter that guards an LLM API gateway. It supports two policies, chosen when the limiter is created: new RateLimiter(\"policy_a\") or new RateLimiter(\"policy_b\"). Any other strategy throws a RangeError.",
    "check(clientId, endpoint, limit, windowMs, capacity, refillRate) is called once per request and returns { allowed, remaining, resetAfterMs }. Every clientId + endpoint pair is limited separately.",
    "policy_a is a sliding window: allow at most limit requests in any rolling windowMs milliseconds. policy_b is a token bucket: each pair starts with capacity tokens, refills refillRate tokens per second up to capacity, and each allowed request spends one token. Each policy ignores the other policy's two arguments.",
    "remaining must be a safe integer and resetAfterMs a finite integer. stats() returns { strategy, totalAllowed, totalRejected, activeKeys }.",
    'In this visualizer, refillRate is tokens per second and each request is [timeMs, "clientId", "endpoint"]; timeMs stands in for Date.now().',
  ],
  examples: [
    {
      input:
        'const limiter = new RateLimiter("policy_a");\n[1, 2, 3].map(() => limiter.check("alice", "/v1/chat", 2, 500, 0, 0));',
      output: "allowed: [true, true, false]\nremaining: [1, 0, 0]",
      explanation:
        "The limit is 2 requests per 500 ms.\nThe third call finds 2 timestamps in the window, so it is rejected,\nwith resetAfterMs ≈ 500 (when the first one expires).",
    },
    {
      input:
        'const limiter = new RateLimiter("policy_b");\n[1, 2, 3, 4].map(() => limiter.check("alice", "/v1/chat", 0, 0, 3, 0.5));',
      output: "allowed: [true, true, true, false]\nremaining: [2, 1, 0, 0]\nresetAfterMs: [0, 0, 0, 2000]",
      explanation:
        "A new bucket starts full with 3 tokens, so a burst of 3 is allowed.\nThe 4th finds 0 tokens. At 0.5 tokens/s, one token takes 2000 ms.",
    },
  ],
  constraints: [
    "Each clientId + endpoint pair has its own state.",
    "Allowed token-bucket decisions report resetAfterMs = 0.",
    "resetAfterMs must be finite, even when refillRate is 0.",
    "Rejected requests don't consume quota.",
  ],
  keyIdeas: [
    "Keep one Map from a key to that pair's state. Build the key as clientId + \"\\u0000\" + endpoint so different pairs can never collide.",
    "Policy A (sliding window log): store the timestamps of allowed requests. On each call, drop timestamps at or before now − windowMs, then allow only if fewer than limit remain.",
    "Policy B (token bucket): store { tokens, updatedAt }. On each call, add (now − updatedAt) / 1000 × refillRate tokens, cap at capacity, and spend one if at least 1 whole token is there.",
    "Refill lazily from timestamps instead of running a timer. Save the new state on rejections too, so elapsed time is never counted twice.",
    "check() is synchronous, so in Node two calls never interleave and no lock is needed.",
    "Count allowed and rejected decisions in check(), after the policy answers, so both policies share the same stats().",
  ],
  guide: {
    why: {
      intro: "Every public API needs to stop one client from using up shared capacity. This project tests:",
      points: [
        "Can you keep per-client, per-endpoint state in a hash map?",
        "Can you implement both a precise sliding window and a burst-friendly token bucket?",
        "Can you report remaining and reset times that are integers and never Infinity or NaN?",
      ],
      analogy:
        "Policy A is a bouncer with a guest log who crosses out anyone who entered more than an hour ago. Policy B is a jar of tokens on a counter that a barista refills slowly; each order costs one token, and a full jar lets you order a few at once.",
    },
    what: {
      summary: "Decide per client and endpoint whether a request may proceed, using a sliding window (policy_a) or a token bucket (policy_b).",
      examples: [
        { text: "policy_a, limit 2 / 500 ms: 3 calls → [✓, ✓, ✗]", note: "reset ≈ 500 ms" },
        { text: "policy_b, capacity 3, 0.5/s: 4 calls → [✓, ✓, ✓, ✗]", note: "reset ≈ 2000 ms" },
        { text: "policy_b, capacity 1, rate 0: /v1/chat ✓ ✗, then /v1/complete ✓", note: "separate buckets" },
      ],
    },
    how: {
      insight:
        "Key insight: one Map keyed by client + endpoint, and each policy only reads and writes its own kind of value there. Policy A filters a timestamp list; policy B refills a bucket from the time since its last update.",
    },
    pitfalls: [
      "Returning Infinity for resetAfterMs when refillRate is 0 — it isn't finite, so callers (and the tests) reject it. Return a large finite integer instead.",
      "Reporting a non-zero resetAfterMs on an allowed token-bucket request — the caller doesn't need to wait.",
      "Returning fractional remaining from the token bucket — use Math.floor, because only whole tokens pay for requests.",
      "Not saving the bucket on a rejection — the next call would add the same elapsed time again and over-refill.",
      "Logging rejected requests in the sliding window — they'd keep the client locked out longer.",
      "Entries are never deleted, so activeKeys and memory grow with every new pair. A production limiter would evict idle keys.",
    ],
  },
  complexity: {
    time: "policy_a: O(limit) per check (filter). policy_b: O(1) per check.",
    space: "O(pairs × limit) for policy_a, O(pairs) for policy_b",
  },
  language: "typescript",
  code,
  inputs: [
    { name: "strategy", label: "strategy", type: "string", placeholder: "policy_b" },
    { name: "limit", label: "limit", type: "json", placeholder: "2" },
    { name: "windowMs", label: "windowMs", type: "json", placeholder: "500" },
    { name: "capacity", label: "capacity", type: "json", placeholder: "3" },
    { name: "refillRate", label: "refillRate", type: "json", placeholder: "0.5" },
    { name: "requests", label: "requests", type: "json", placeholder: '[[0,"alice","/v1/chat"],[0,"alice","/v1/chat"]]' },
  ],
  presets: [
    {
      label: "Policy B: burst",
      values: {
        strategy: "policy_b",
        limit: "0",
        windowMs: "0",
        capacity: "3",
        refillRate: "0.5",
        requests: '[[0,"alice","/v1/chat"],[0,"alice","/v1/chat"],[0,"alice","/v1/chat"],[0,"alice","/v1/chat"],[2000,"alice","/v1/chat"]]',
      },
    },
    {
      label: "Policy B: endpoints",
      values: {
        strategy: "policy_b",
        limit: "2",
        windowMs: "500",
        capacity: "1",
        refillRate: "0",
        requests: '[[0,"alice","/v1/chat"],[0,"alice","/v1/chat"],[0,"alice","/v1/complete"]]',
      },
    },
    {
      label: "Policy A: window",
      values: {
        strategy: "policy_a",
        limit: "2",
        windowMs: "500",
        capacity: "0",
        refillRate: "0",
        requests: '[[0,"alice","/v1/chat"],[100,"alice","/v1/chat"],[200,"alice","/v1/chat"],[600,"alice","/v1/chat"]]',
      },
    },
    {
      label: "Policy A: clients",
      values: {
        strategy: "policy_a",
        limit: "1",
        windowMs: "500",
        capacity: "0",
        refillRate: "0",
        requests: '[[0,"alice","/v1/chat"],[0,"alice","/v1/chat"],[0,"bob","/v1/chat"]]',
      },
    },
  ],
  trace(input) {
    const strategy = expectStrategy(input.strategy);
    const isA = strategy === "policy_a";
    const limit = expectInt(input.limit, "limit");
    const windowMs = expectInt(input.windowMs, "windowMs");
    const capacity = expectNumber(input.capacity, "capacity", 0, 10);
    const refillRate = expectNumber(input.refillRate, "refillRate", 0, 100);
    if (isA && (limit < 1 || limit > 10)) throw new Error("limit must be between 1 and 10 for policy_a.");
    if (isA && (windowMs < 1 || windowMs > 100_000)) throw new Error("windowMs must be between 1 and 100000 for policy_a.");
    const requests = expectRequests(input.requests);

    const t = new Tracer();
    const logs = new Map<string, number[]>();
    const buckets = new Map<string, Bucket>();
    const keys: string[] = [];
    const results: (boolean | undefined)[] = requests.map(() => undefined);
    let totalAllowed = 0;
    let totalRejected = 0;
    let locals: Record<string, Primitive> = {};

    const save = (key: string) => {
      if (!keys.includes(key)) keys.push(key);
    };
    const stored = (key: string): string | undefined => {
      if (isA) {
        const log = logs.get(key);
        return log && list(log);
      }
      const b = buckets.get(key);
      return b && `${fmt(b.tokens)} tokens @ ${b.updatedAt}ms`;
    };

    const snapshot = (
      current: number | undefined,
      opts: { key?: string; keyTone?: Tone; changed?: string[]; done?: boolean } = {},
    ): Viz[] => {
      const reqTones: Record<number, Tone> = {};
      const resultTones: Record<number, Tone> = {};
      results.forEach((r, i) => {
        if (r === undefined) return;
        reqTones[i] = r ? "visited" : "error";
        resultTones[i] = r ? (opts.done ? "found" : "visited") : "error";
      });
      if (current !== undefined) reqTones[current] = "active";
      const mapTones: Record<string, Tone> = {};
      if (opts.key && keys.includes(opts.key)) mapTones[showKey(opts.key)] = opts.keyTone ?? "active";
      const req = current !== undefined ? requests[current] : undefined;

      return [
        {
          kind: "array",
          id: "requests",
          label: "request times (ms)",
          values: requests.map((r) => r.t),
          tones: reqTones,
          pointers: current !== undefined ? [{ name: "now", index: current, tone: "active" }] : [],
        },
        {
          kind: "array",
          id: "results",
          label: "allowed?",
          values: results.map((r) => (r === undefined ? "" : r ? "✓" : "✗")),
          tones: resultTones,
        },
        {
          kind: "map",
          id: "state",
          label: isA ? "state  (key → timestamps in window)" : "state  (key → bucket)",
          entries: keys.map((k) => [showKey(k), stored(k) ?? ""]),
          tones: mapTones,
        },
        {
          kind: "vars",
          id: "call",
          label: "check() call",
          vars: {
            clientId: req?.client ?? "",
            endpoint: req?.endpoint ?? "",
            ...(isA ? { limit, windowMs } : { capacity, refillRate }),
          },
        },
        { kind: "vars", id: "locals", label: "local variables", vars: locals, changed: opts.changed },
        {
          kind: "vars",
          id: "stats",
          label: "stats()",
          vars: { strategy, totalAllowed, totalRejected, activeKeys: keys.length },
          changed: opts.changed,
        },
      ];
    };

    const policyA = (i: number, key: string, now: number): Decision => {
      locals = { key: showKey(key) };
      const s = (line: number, message: string, opts: Parameters<typeof snapshot>[1] = {}) =>
        t.step(line, message, snapshot(i, { key, ...opts }));
      s(L.aKey, `key = clientId + "\\u0000" + endpoint. The invisible separator keeps every client + endpoint pair apart.`, {
        changed: ["key"],
      });
      locals.now = now;
      s(L.aNow, `Date.now() is ${now}ms for this request.`, { changed: ["now"] });
      const windowStart = now - windowMs;
      locals.windowStart = windowStart;
      s(L.aWindowStart, `windowStart = ${now} − ${windowMs} = ${windowStart}. Only timestamps after this still count.`, {
        changed: ["windowStart"],
      });
      const counted = logs.get(key) ?? [];
      locals.counted = list(counted);
      s(
        L.aGet,
        logs.has(key)
          ? `This pair is already in the map with timestamps ${list(counted)}.`
          : "This pair isn't in the map yet, so it starts with an empty list.",
        { changed: ["counted"] },
      );
      const inWindow = counted.filter((ts) => ts > windowStart);
      locals.countedInWindow = list(inWindow);
      const dropped = counted.length - inWindow.length;
      s(
        L.aFilter,
        dropped > 0
          ? `Drop ${dropped} timestamp${dropped === 1 ? "" : "s"} at or before ${windowStart}. ${inWindow.length} remain in the window.`
          : `Nothing has expired. ${inWindow.length} timestamp${inWindow.length === 1 ? " is" : "s are"} in the window.`,
        { changed: ["countedInWindow"] },
      );
      const full = inWindow.length >= limit;
      s(
        L.aIf,
        full
          ? `${inWindow.length} ≥ limit ${limit}, so the window is full.`
          : `${inWindow.length} < limit ${limit}, so there's room for this request.`,
      );
      if (full) {
        logs.set(key, inWindow);
        save(key);
        s(L.aSetRejected, "Save the cleaned list without adding this request, so a rejected call doesn't use up quota.", {
          keyTone: "error",
        });
        const resetAfterMs = Math.max(0, inWindow[0] + windowMs - now);
        Object.assign(locals, { allowed: "✗", remaining: 0, resetAfterMs });
        s(
          L.aResetRejected,
          `Reject. resetAfterMs = ${inWindow[0]} + ${windowMs} − ${now} = ${resetAfterMs}ms, when the oldest timestamp leaves the window.`,
          { keyTone: "error", changed: ["allowed", "remaining", "resetAfterMs"] },
        );
        return { allowed: false, remaining: 0, resetAfterMs };
      }
      inWindow.push(now);
      locals.countedInWindow = list(inWindow);
      s(L.aPush, `Record this request by pushing ${now}.`, { changed: ["countedInWindow"] });
      logs.set(key, inWindow);
      save(key);
      s(L.aSetAllowed, "Save the list back into the map under this key.", { keyTone: "found" });
      const remaining = Math.max(0, limit - inWindow.length);
      const resetAfterMs = Math.max(0, inWindow[0] + windowMs - now);
      Object.assign(locals, { allowed: "✓", remaining, resetAfterMs });
      s(
        L.aRemaining,
        `Allow. remaining = ${limit} − ${inWindow.length} = ${remaining}, and resetAfterMs = ${inWindow[0]} + ${windowMs} − ${now} = ${resetAfterMs}ms.`,
        { keyTone: "found", changed: ["allowed", "remaining", "resetAfterMs"] },
      );
      return { allowed: true, remaining, resetAfterMs };
    };

    const policyB = (i: number, key: string, now: number): Decision => {
      locals = { key: showKey(key) };
      const s = (line: number, message: string, opts: Parameters<typeof snapshot>[1] = {}) =>
        t.step(line, message, snapshot(i, { key, ...opts }));
      s(L.bKey, `key = clientId + "\\u0000" + endpoint, so this pair gets its own bucket.`, { changed: ["key"] });
      locals.now = now;
      s(L.bNow, `Date.now() is ${now}ms for this request.`, { changed: ["now"] });
      const bucket = buckets.get(key);
      locals.stored = bucket ? `${fmt(bucket.tokens)} tokens @ ${bucket.updatedAt}ms` : "undefined";
      s(
        L.bStored,
        bucket
          ? `Found this pair's bucket: ${fmt(bucket.tokens)} tokens, last updated at ${bucket.updatedAt}ms.`
          : "This pair has no bucket yet.",
        { changed: ["stored"] },
      );
      const tokens = bucket?.tokens ?? capacity;
      locals.tokens = fmt(tokens);
      s(
        L.bTokens,
        bucket ? `tokens = ${fmt(tokens)}, left over from the last request.` : `A new bucket starts full: tokens = capacity = ${capacity}.`,
        { changed: ["tokens"] },
      );
      const updatedAt = bucket?.updatedAt ?? now;
      locals.updatedAt = updatedAt;
      s(
        L.bUpdatedAt,
        bucket ? `updatedAt = ${updatedAt}ms, when those tokens were counted.` : `updatedAt = now = ${now}ms, so no time has passed yet.`,
        { changed: ["updatedAt"] },
      );
      const elapsedSec = (now - updatedAt) / 1000;
      locals.elapsedSec = fmt(elapsedSec);
      s(L.bElapsed, `elapsedSec = (${now} − ${updatedAt}) / 1000 = ${fmt(elapsedSec)}s.`, { changed: ["elapsedSec"] });
      const uncapped = tokens + elapsedSec * refillRate;
      const refilled = Math.min(capacity, uncapped);
      locals.refilled = fmt(refilled);
      s(
        L.bRefilled,
        uncapped > capacity
          ? `${fmt(tokens)} + ${fmt(elapsedSec)} × ${refillRate} = ${fmt(uncapped)}, which is over capacity, so refilled = ${capacity}.`
          : `refilled = ${fmt(tokens)} + ${fmt(elapsedSec)} × ${refillRate} = ${fmt(refilled)} tokens.`,
        { changed: ["refilled"] },
      );
      const empty = refilled < 1;
      s(L.bIf, empty ? `${fmt(refilled)} < 1, so there isn't a whole token for this request.` : `${fmt(refilled)} ≥ 1, so there's a token to spend.`);
      if (empty) {
        buckets.set(key, { tokens: refilled, updatedAt: now });
        save(key);
        s(L.bSetRejected, `Save ${fmt(refilled)} tokens at ${now}ms, so this elapsed time isn't counted again next call.`, {
          keyTone: "error",
        });
        const resetAfterMs = refillRate > 0 ? Math.ceil(((1 - refilled) / refillRate) * 1000) : NEVER_MS;
        locals.resetAfterMs = showReset(resetAfterMs);
        s(
          L.bReset,
          refillRate > 0
            ? `resetAfterMs = ceil((1 − ${fmt(refilled)}) / ${refillRate} × 1000) = ${resetAfterMs}ms until one whole token.`
            : "refillRate is 0, so this bucket never refills. Report the largest finite wait, 2^63 − 1, instead of Infinity.",
          { keyTone: "error", changed: ["resetAfterMs"] },
        );
        Object.assign(locals, { allowed: "✗", remaining: 0 });
        s(L.bReturnRejected, "Reject with remaining = 0.", { keyTone: "error", changed: ["allowed", "remaining"] });
        return { allowed: false, remaining: 0, resetAfterMs };
      }
      const afterSpend = refilled - 1;
      locals.afterSpend = fmt(afterSpend);
      s(L.bSpend, `Spend one token: ${fmt(refilled)} − 1 = ${fmt(afterSpend)}.`, { changed: ["afterSpend"] });
      buckets.set(key, { tokens: afterSpend, updatedAt: now });
      save(key);
      s(L.bSetAllowed, `Save ${fmt(afterSpend)} tokens at ${now}ms.`, { keyTone: "found" });
      const remaining = Math.floor(afterSpend);
      Object.assign(locals, { allowed: "✓", remaining, resetAfterMs: 0 });
      s(
        L.bRemaining,
        `Allow. remaining = floor(${fmt(afterSpend)}) = ${remaining}, and resetAfterMs = 0 because there's no wait.`,
        { keyTone: "found", changed: ["allowed", "remaining", "resetAfterMs"] },
      );
      return { allowed: true, remaining, resetAfterMs: 0 };
    };

    t.step(
      L.ctor,
      `new RateLimiter("${strategy}"): ${isA ? "sliding window" : "token bucket"}. The state map is empty and both counters start at 0.`,
      snapshot(undefined),
    );

    requests.forEach((r, i) => {
      const key = `${r.client}\u0000${r.endpoint}`;
      locals = {};
      t.step(L.check, `Request ${i}: ${r.client} calls ${r.endpoint} at t = ${r.t}ms.`, snapshot(i, { key }));
      t.step(
        L.dispatch,
        isA
          ? 'strategy is "policy_a", so use policyA. capacity and refillRate are ignored.'
          : 'strategy is "policy_b", so use policyB. limit and windowMs are ignored.',
        snapshot(i, { key }),
      );
      const decision = isA ? policyA(i, key, r.t) : policyB(i, key, r.t);
      results[i] = decision.allowed;
      if (decision.allowed) totalAllowed++;
      else totalRejected++;
      t.step(
        decision.allowed ? L.incAllowed : L.incRejected,
        `${decision.allowed ? `Allowed, so totalAllowed = ${totalAllowed}` : `Rejected, so totalRejected = ${totalRejected}`}. check() returns { allowed: ${decision.allowed}, remaining: ${decision.remaining}, resetAfterMs: ${showReset(decision.resetAfterMs)} }.`,
        snapshot(i, {
          key,
          keyTone: decision.allowed ? "found" : "error",
          changed: [decision.allowed ? "totalAllowed" : "totalRejected", "activeKeys"],
        }),
      );
    });

    locals = {};
    t.step(
      L.stats,
      `stats(): ${totalAllowed} allowed, ${totalRejected} rejected, ${keys.length} active key${keys.length === 1 ? "" : "s"}.`,
      snapshot(undefined, { done: true }),
      true,
    );
    return t.frames;
  },
};
