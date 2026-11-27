"use client";

import { ArrowRight, Check, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toggleDone, useDoneProblems } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Difficulty, Problem } from "@/lib/viz/types";
import { problems } from "@/problems";

const FILTERS: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard"];

function formatDoneAt(at: number): string {
  const date = new Date(at);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ProblemLibrary() {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");
  const done = useDoneProblems();
  const doneCount = problems.filter((p) => p.slug in done).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (difficulty !== "All" && p.difficulty !== difficulty) return false;
      if (!q) return true;
      return [p.title, String(p.number ?? ""), p.pattern, ...p.tags].some((s) => s.toLowerCase().includes(q));
    });
  }, [query, difficulty]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, number, pattern or tag"
            className="h-9 pl-8"
            aria-label="Search problems"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            <span className={cn("font-medium", doneCount > 0 ? "text-emerald-300" : "text-foreground")}>{doneCount}</span>{" "}
            / {problems.length} done
          </span>
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5" role="group" aria-label="Filter by difficulty">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setDifficulty(f)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm transition-colors",
                  difficulty === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No problems match your search</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or difficulty.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(""); setDifficulty("All"); }}>
            Clear filters
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProblemCard key={p.slug} problem={p} doneAt={done[p.slug]} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProblemCard({ problem: p, doneAt }: { problem: Problem; doneAt: number | undefined }) {
  const isDone = doneAt !== undefined;
  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-card/40 transition-colors has-[>a:hover]:bg-card",
        isDone
          ? "border-emerald-400/40 has-[>a:hover]:border-emerald-400/70"
          : "border-border has-[>a:hover]:border-violet-400/50",
      )}
    >
      <Link href={`/problems/${p.slug}`} className="group flex flex-1 flex-col p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold leading-snug">
            {p.number !== undefined && <span className="text-muted-foreground">{p.number}.</span>}{" "}
            {p.title}
          </h2>
          <DifficultyBadge difficulty={p.difficulty} className="shrink-0" />
        </div>
        <p className="mt-2 text-sm text-violet-200/90">{p.pattern}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.guide.what.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="flex flex-wrap gap-1">
            {p.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[11px]">
                {t}
              </Badge>
            ))}
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2">
        <button
          type="button"
          onClick={() => toggleDone(p.slug)}
          aria-pressed={isDone}
          aria-label={isDone ? `Mark ${p.title} as not done` : `Mark ${p.title} as done`}
          className={cn(
            "group/done flex items-center gap-2 rounded-md text-xs transition-colors",
            isDone ? "text-emerald-300" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full border transition-colors",
              isDone ? "border-emerald-400 bg-emerald-400 text-emerald-950" : "border-muted-foreground/50 group-hover/done:border-foreground",
            )}
          >
            <Check className={cn("size-3.5", !isDone && "opacity-0 group-hover/done:opacity-40")} strokeWidth={3} />
          </span>
          {isDone ? "Done" : "Mark as done"}
        </button>
        {isDone && (
          <time dateTime={new Date(doneAt).toISOString()} className="text-xs text-muted-foreground">
            {formatDoneAt(doneAt)}
          </time>
        )}
      </div>
    </li>
  );
}
