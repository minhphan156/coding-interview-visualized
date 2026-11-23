import type { Tone } from "@/lib/viz/types";

export const cellTone: Record<Tone | "default", string> = {
  default: "border-border bg-card text-foreground",
  active: "border-amber-400 bg-amber-400/15 text-amber-200 shadow-[0_0_0_3px] shadow-amber-400/20",
  compare: "border-sky-400 bg-sky-400/15 text-sky-200",
  found: "border-emerald-400 bg-emerald-400/20 text-emerald-200 shadow-[0_0_0_3px] shadow-emerald-400/25",
  muted: "border-border/50 bg-muted/30 text-muted-foreground/60",
  error: "border-rose-400 bg-rose-400/15 text-rose-200",
  visited: "border-violet-400/70 bg-violet-500/25 text-violet-200",
};

export const barTone: Record<Tone | "default", string> = {
  default: "bg-zinc-500/70",
  active: "bg-amber-400",
  compare: "bg-sky-400",
  found: "bg-emerald-400",
  muted: "bg-zinc-700",
  error: "bg-rose-400",
  visited: "bg-violet-400",
};

export const pointerTone: Record<Tone | "default", string> = {
  default: "bg-zinc-200 text-zinc-900",
  active: "bg-amber-400 text-amber-950",
  compare: "bg-sky-400 text-sky-950",
  found: "bg-emerald-400 text-emerald-950",
  muted: "bg-zinc-600 text-zinc-200",
  error: "bg-rose-400 text-rose-950",
  visited: "bg-violet-400 text-violet-950",
};

export const spanTone: Record<Tone | "default", string> = {
  default: "bg-sky-400/15 border-sky-400/50",
  active: "bg-amber-400/15 border-amber-400/60",
  compare: "bg-sky-400/20 border-sky-400/60",
  found: "bg-emerald-400/25 border-emerald-400/70",
  muted: "bg-zinc-400/10 border-zinc-400/30",
  error: "bg-rose-400/15 border-rose-400/50",
  visited: "bg-violet-400/15 border-violet-400/50",
};

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  return String(v);
}
