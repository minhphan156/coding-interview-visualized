"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/viz/types";
import { problems } from "@/problems";

const FILTERS: ("All" | Difficulty)[] = ["All", "Easy", "Medium", "Hard"];

export function ProblemLibrary() {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<"All" | Difficulty>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (difficulty !== "All" && p.difficulty !== difficulty) return false;
      if (!q) return true;
      return [p.title, String(p.number), p.pattern, ...p.tags].some((s) => s.toLowerCase().includes(q));
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
            <li key={p.slug}>
              <Link
                href={`/problems/${p.slug}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-card/40 p-4 transition-colors hover:border-violet-400/50 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold leading-snug">
                    <span className="text-muted-foreground">{p.number}.</span> {p.title}
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
