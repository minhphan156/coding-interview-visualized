import { Tracer, expectInt, expectTimestamps } from "@/lib/viz/tracer";
import type { Primitive, Problem, Tone, Viz } from "@/lib/viz/types";

const code = `class SlidingWindowLog {
    private log: number[] = [];
    constructor(private limit: number, private windowSec: number) {}
    allow(now: number): boolean {
        while (this.log.length > 0 && this.log[0] <= now - this.windowSec) {
            this.log.shift();
        }
        if (this.log.length < this.limit) {
            this.log.push(now);
            return true;
        }
        return false;
    }
}`;

export const slidingWindowRateLimiter: Problem = {
  slug: "sliding-window-rate-limiter",
  title: "Sliding Window Rate Limiter",
  difficulty: "Medium",
  pattern: "Sliding window log (queue of timestamps)",
  tags: ["System Design", "Rate Limiting", "Queue", "Sliding Window"],
  description: [
    "Design a rate limiter that allows at most limit requests in any rolling window of windowSec seconds.",
    "Implement allow(now), called with the time in seconds of each incoming request (in non-decreasing order). A request at time now is allowed if fewer than limit requests were allowed in the window (now − windowSec, now]. Allowed requests count toward future windows; rejected ones don't.",
  ],
  examples: [
    {
      input: "const limiter = new SlidingWindowLog(3, 10);\n[8, 9, 9, 10, 11, 18].map((t) => limiter.allow(t));",
      output: "[true, true, true, false, false, true]",
      explanation:
        "t=8, 9, 9: three requests fill the window.\nt=10, 11: the window still holds 8, 9, 9, so both are rejected.\n          (A fixed window resetting at t=10 would wrongly allow them.)\nt=18: 8 has left the window (18 − 10 = 8), so there's room again.",
    },
  ],
  constraints: ["1 <= limit <= 10", "1 <= windowSec <= 100", "Timestamps are non-decreasing."],
  keyIdeas: [
    "Keep a log (queue) of the timestamps of allowed requests, oldest first.",
    "When a request arrives at now, the window is (now − windowSec, now]. Pop timestamps from the front while they're at or before now − windowSec; they've expired.",
    "Because timestamps arrive in order, expired entries are always at the front, so a queue is enough.",
    "If fewer than limit timestamps remain, push now and allow. Otherwise reject, and don't log the rejected request.",
    "The window moves with the clock, so there's no boundary to exploit the way there is with a fixed window that resets on the hour.",
  ],
  guide: {
    why: {
      intro: "This is the precise way to enforce \"at most N per rolling period\". It tests:",
      points: [
        "Can you see why a fixed window lets 2× the limit through at the boundary?",
        "Can you use a queue to expire old events in order?",
        "Can you weigh exactness against memory? The log stores one timestamp per allowed request.",
      ],
      analogy:
        "Think of a bouncer with a guest log. A lazy bouncer uses a clicker and resets it on the hour, so 100 people at 8:59 and 100 more at 9:00 all get in. The careful bouncer crosses out anyone who entered more than 60 minutes ago, then counts the names still on the list. Under 100, you're in.",
    },
    what: {
      summary: "Allow a request only if fewer than limit allowed requests happened in the last windowSec seconds.",
      examples: [
        { text: "limit 3, window 10: [8,9,9,10,11,18] → [✓,✓,✓,✗,✗,✓]", note: "8 expires at t = 18" },
      ],
    },
    how: {
      insight:
        "Key insight: store allowed timestamps in a queue. On each call, drop entries ≤ now − windowSec from the front, then allow only if the queue is shorter than limit.",
    },
    pitfalls: [
      "Using a fixed window (a counter that resets every windowSec) — bursts on either side of the reset let through up to 2× the limit.",
      "Logging rejected requests — they'd count against the user and keep them locked out longer.",
      "Off-by-one on expiry — with the window (now − windowSec, now], an entry exactly at now − windowSec has expired, so use <=.",
      "Memory grows with the limit. For very high limits, use the sliding window counter instead: keep only this window's and last window's counts and estimate current + previous × (fraction of the previous window still in range).",
    ],
  },
  complexity: { time: "O(1) amortized per request", space: "O(limit) per user" },
  language: "typescript",
  code,
  inputs: [
    { name: "limit", label: "limit", type: "json", placeholder: "3" },
    { name: "windowSec", label: "windowSec", type: "json", placeholder: "10" },
    { name: "times", label: "request times (seconds)", type: "json", placeholder: "[8,9,9,10,11,18,19,20]" },
  ],
  presets: [
    { label: "Boundary burst", values: { limit: "3", windowSec: "10", times: "[8,9,9,10,11,18,19,20]" } },
    { label: "Burst", values: { limit: "3", windowSec: "5", times: "[0,0,0,0,1,5,6]" } },
    { label: "Steady traffic", values: { limit: "2", windowSec: "5", times: "[0,3,6,9,12]" } },
  ],
  trace(input) {
    const limit = expectInt(input.limit, "limit");
    if (limit < 1 || limit > 10) throw new Error("limit must be between 1 and 10.");
    const windowSec = expectInt(input.windowSec, "windowSec");
    if (windowSec < 1 || windowSec > 100) throw new Error("windowSec must be between 1 and 100.");
    const times = expectTimestamps(input.times);
    const t = new Tracer();
    const log: number[] = [];
    const results: (boolean | undefined)[] = times.map(() => undefined);

    const snapshot = (
      current: number | undefined,
      opts: { logTones?: Record<number, Tone>; vars?: Record<string, Primitive>; changed?: string[]; done?: boolean } = {},
    ): Viz[] => {
      const inLog = new Set(log);
      const reqTones: Record<number, Tone> = {};
      const resultTones: Record<number, Tone> = {};
      results.forEach((r, i) => {
        if (r === undefined) return;
        reqTones[i] = !r ? "error" : inLog.has(i) ? "compare" : "muted";
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
          id: "log",
          label: `log  (${log.length} / ${limit} in window)`,
          values: log.map((i) => times[i]),
          ids: [...log],
          tones: Object.fromEntries(log.map((_, k) => [k, opts.logTones?.[k] ?? "compare"])),
        },
        {
          kind: "vars",
          id: "vars",
          label: "variables",
          vars: { limit, windowSec, ...opts.vars },
          changed: opts.changed,
        },
      ];
    };

    t.step(
      3,
      `Create a limiter that allows ${limit} request${limit === 1 ? "" : "s"} per rolling ${windowSec}s window. The log of allowed timestamps starts empty.`,
      snapshot(undefined),
    );

    times.forEach((now, i) => {
      const cutoff = now - windowSec;
      const vars = { now, cutoff };
      t.step(
        4,
        `Request ${i} arrives at t = ${now}. Its window is (${cutoff}, ${now}], so anything at or before ${cutoff} has expired.`,
        snapshot(i, { vars, changed: ["now", "cutoff"] }),
      );

      while (log.length > 0 && times[log[0]] <= cutoff) {
        t.step(5, `log[0] = ${times[log[0]]} ≤ ${cutoff}, so the oldest entry is outside the window.`, snapshot(i, { logTones: { 0: "error" }, vars }));
        const gone = times[log.shift()!];
        t.step(6, `Drop ${gone} from the front of the log.`, snapshot(i, { vars }));
      }
      t.step(
        5,
        log.length === 0
          ? "The log is empty, so there's nothing left to expire."
          : `log[0] = ${times[log[0]]} > ${cutoff}, so it's still inside the window. Stop expiring.`,
        snapshot(i, { logTones: log.length ? { 0: "active" } : {}, vars }),
      );

      const room = log.length < limit;
      t.step(
        8,
        room
          ? `${log.length} request${log.length === 1 ? "" : "s"} in the window < limit ${limit}, so there's room.`
          : `${log.length} requests in the window already hit the limit of ${limit}.`,
        snapshot(i, { vars }),
      );

      if (room) {
        log.push(i);
        t.step(9, `Push ${now} onto the log.`, snapshot(i, { logTones: { [log.length - 1]: "found" }, vars }));
        results[i] = true;
        t.step(10, `Return true: request ${i} at t = ${now} is allowed.`, snapshot(i, { vars }));
      } else {
        results[i] = false;
        t.step(12, `Return false: request ${i} at t = ${now} is rejected and not logged.`, snapshot(i, { vars }));
      }
    });

    const allowed = results.filter(Boolean).length;
    t.step(
      14,
      `Done: ${allowed} of ${times.length} requests were allowed and ${times.length - allowed} were rejected.`,
      snapshot(undefined, { vars: { allowed }, changed: ["allowed"], done: true }),
      true,
    );
    return t.frames;
  },
};
