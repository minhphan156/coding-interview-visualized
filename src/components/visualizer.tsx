"use client";

import {
  ArrowLeft,
  ExternalLink,
  Brain,
  ChevronFirst,
  ChevronLast,
  EyeOff,
  Eye,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
  CircleCheck,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodePanel } from "@/components/viz/code-panel";
import { StructureView } from "@/components/viz/structures";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ResizableWorkspace, useIsDesktop } from "@/components/resizable-layout";
import { cn } from "@/lib/utils";
import type { Frame, InputValues, Problem, Viz } from "@/lib/viz/types";
import { getProblem } from "@/problems";

const SPEEDS = [0.5, 1, 2, 4];
const LANGUAGE_NAMES: Record<string, string> = { python: "Python 3", typescript: "TypeScript" };
const BASE_DELAY_MS = 1100;

function runTrace(problem: Problem, values: InputValues): { frames: Frame[] } | { error: string } {
  const parsed: Record<string, unknown> = {};
  for (const field of problem.inputs) {
    const raw = values[field.name] ?? "";
    if (field.type === "string") {
      parsed[field.name] = raw;
      continue;
    }
    try {
      parsed[field.name] = JSON.parse(raw);
    } catch {
      return { error: `${field.label} isn't valid JSON. Example: ${field.placeholder ?? "[1,2,3]"}` };
    }
  }
  try {
    const frames = problem.trace(parsed);
    if (frames.length === 0) return { error: "This input produced no steps." };
    return { frames };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong while tracing this input." };
  }
}

function layoutClass(viz: Viz) {
  if (viz.kind === "stack") return "w-full sm:w-auto sm:min-w-56";
  if (viz.kind === "grid") return "w-full sm:w-auto";
  return "w-full";
}

export function Visualizer({ slug }: { slug: string }) {
  const problem = getProblem(slug)!;
  const [values, setValues] = useState<InputValues>(problem.presets[0]?.values ?? {});
  const [draft, setDraft] = useState<InputValues>(values);
  const [activePreset, setActivePreset] = useState<number | null>(0);
  const [index, setIndex] = useState(0);
  const [playRequested, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [recallMode, setRecallMode] = useState(false);
  const isDesktop = useIsDesktop();

  const result = useMemo(() => runTrace(problem, values), [problem, values]);
  const frames = useMemo(() => ("frames" in result ? result.frames : []), [result]);
  const draftResult = useMemo(() => runTrace(problem, draft), [problem, draft]);
  const draftError = "error" in draftResult ? draftResult.error : null;
  const dirty = problem.inputs.some((f) => (draft[f.name] ?? "") !== (values[f.name] ?? ""));

  const last = Math.max(0, frames.length - 1);
  const frame = frames[Math.min(index, last)];
  const atEnd = index >= last;
  const playing = playRequested && !atEnd;

  const revealedLines = useMemo(() => {
    const set = new Set<number>([1, 2]);
    for (let i = 0; i <= Math.min(index, last); i++) set.add(frames[i].line);
    return set;
  }, [frames, index, last]);

  const apply = useCallback(
    (next: InputValues) => {
      setValues(next);
      setIndex(0);
      setPlaying(false);
    },
    [],
  );

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), BASE_DELAY_MS / speed);
    return () => clearTimeout(id);
  }, [playing, index, last, speed]);

  const togglePlay = useCallback(() => {
    if (atEnd) {
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying(!playing);
    }
  }, [atEnd, playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [role=slider], [contenteditable=true]")) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight" || e.key === "l") {
        setPlaying(false);
        setIndex((i) => Math.min(i + 1, last));
      } else if (e.key === "ArrowLeft" || e.key === "j") {
        setPlaying(false);
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Home") {
        setIndex(0);
      } else if (e.key === "End") {
        setIndex(last);
      } else if (e.key === "r") {
        setRecallMode((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, last]);

  const inputCard = (
    <section className={cn("rounded-xl border border-border bg-card/40 p-3", isDesktop && "h-full overflow-y-auto")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Input</span>
        {problem.presets.map((p, i) => (
          <Button
            key={p.label}
            size="xs"
            variant={activePreset === i ? "secondary" : "ghost"}
            onClick={() => {
              setActivePreset(i);
              setDraft(p.values);
              apply(p.values);
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          if (draftError) return;
          setActivePreset(problem.presets.findIndex((p) => problem.inputs.every((f) => p.values[f.name] === draft[f.name])));
          apply(draft);
        }}
      >
        <div className="grid flex-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
          {problem.inputs.map((f) => (
            <label key={f.name} className="flex items-center gap-2 rounded-lg border border-input bg-background/50 px-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{f.label} =</span>
              <input
                value={draft[f.name] ?? ""}
                placeholder={f.placeholder}
                spellCheck={false}
                onChange={(e) => setDraft((d) => ({ ...d, [f.name]: e.target.value }))}
                className="h-8 w-full min-w-0 bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </label>
          ))}
        </div>
        <Button type="submit" size="default" disabled={!!draftError || !dirty}>
          Visualize
        </Button>
      </form>
      {dirty && draftError && <p className="mt-2 text-xs text-rose-300">{draftError}</p>}
    </section>
  );

  const canvasCard = (
    <section className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-card/40", isDesktop ? "h-full" : "min-h-[420px] flex-1")}>
      {"error" in result ? (
        <div className="m-auto max-w-sm p-6 text-center">
          <p className="font-medium">This input can&apos;t be visualized</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.error}</p>
        </div>
      ) : (
        <>
          <div className="flex min-h-16 items-start gap-3 border-b border-border bg-background/40 px-4 py-3">
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                frame.done ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/15 text-amber-300",
              )}
            >
              {frame.done ? <CircleCheck className="size-3.5" /> : `L${frame.line}`}
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-[15px] leading-snug"
                aria-live="polite"
              >
                {frame.message}
              </motion.p>
            </AnimatePresence>
          </div>
          <LayoutGroup>
            <div className="flex min-h-0 flex-1 flex-wrap content-start gap-x-10 gap-y-6 overflow-auto p-4 sm:p-6">
              {frame.structures.map((viz) => (
                <div key={viz.id} className={layoutClass(viz)}>
                  <StructureView viz={viz} />
                </div>
              ))}
            </div>
          </LayoutGroup>
        </>
      )}
    </section>
  );

  const controlsCard = (
    <section className={cn("rounded-xl border border-border bg-card/40 p-3", isDesktop && "h-full overflow-y-auto")}>
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {frames.length ? `${Math.min(index, last) + 1} / ${frames.length}` : "–"}
        </span>
        <Slider
          value={[Math.min(index, last)]}
          min={0}
          max={last}
          step={1}
          disabled={frames.length < 2}
          aria-label="Step"
          onValueChange={(v) => {
            setPlaying(false);
            setIndex(Array.isArray(v) ? v[0] : (v as number));
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="First step" disabled={!frames.length} onClick={() => { setPlaying(false); setIndex(0); }}>
            <ChevronFirst />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Previous step" disabled={index === 0} onClick={() => { setPlaying(false); setIndex((i) => Math.max(0, i - 1)); }}>
            <StepBack />
          </Button>
          <Button size="icon-lg" className="rounded-full" aria-label={playing ? "Pause" : atEnd ? "Replay" : "Play"} disabled={!frames.length} onClick={togglePlay}>
            {playing ? <Pause /> : atEnd ? <RotateCcw /> : <Play />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Next step" disabled={atEnd} onClick={() => { setPlaying(false); setIndex((i) => Math.min(last, i + 1)); }}>
            <StepForward />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Last step" disabled={!frames.length} onClick={() => { setPlaying(false); setIndex(last); }}>
            <ChevronLast />
          </Button>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "rounded-md px-2 py-1 font-mono text-xs transition-colors",
                speed === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 hidden text-[11px] text-muted-foreground sm:block">
        Shortcuts: <kbd className="font-mono">space</kbd> play/pause · <kbd className="font-mono">← →</kbd> step ·{" "}
        <kbd className="font-mono">r</kbd> recall mode
      </p>
    </section>
  );

  const sidePanel = (
  <aside className={cn("flex min-w-0 flex-col", isDesktop && "h-full")}>
    <Tabs defaultValue="code" className={cn("flex-1 rounded-xl border border-border bg-card/40 p-3", isDesktop && "min-h-0 overflow-y-auto")}>
      <TabsList className="w-full">
        <TabsTrigger value="code">Code</TabsTrigger>
        <TabsTrigger value="ideas">Key ideas</TabsTrigger>
        <TabsTrigger value="problem">Problem</TabsTrigger>
      </TabsList>
      <TabsContent value="code" className="flex flex-col gap-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {LANGUAGE_NAMES[problem.language] ?? problem.language}
          </span>
          <Button
            size="xs"
            variant={recallMode ? "secondary" : "ghost"}
            onClick={() => setRecallMode((r) => !r)}
            aria-pressed={recallMode}
          >
            {recallMode ? <EyeOff /> : <Eye />}
            Recall mode {recallMode ? "on" : "off"}
          </Button>
        </div>
        {recallMode && (
          <p className="rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs text-violet-100">
            <Brain className="mr-1 inline size-3.5" />
            Lines stay blurred until the walkthrough reaches them. Before each step, try to say the next line out loud.
          </p>
        )}
        <CodePanel code={problem.code} activeLine={frame?.line ?? 0} recallMode={recallMode} revealedLines={revealedLines} />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="text-muted-foreground">Time</div>
            <div className="font-mono font-semibold">{problem.complexity.time}</div>
          </div>
          <div className="rounded-lg border border-border px-3 py-2">
            <div className="text-muted-foreground">Space</div>
            <div className="font-mono font-semibold">{problem.complexity.space}</div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="ideas" className="pt-1">
        <p className="mb-3 text-xs text-muted-foreground">
          Pattern: <span className="text-violet-200">{problem.pattern}</span>
        </p>
        <ol className="flex flex-col gap-2">
          {problem.keyIdeas.map((idea, i) => (
            <li key={i} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3 leading-relaxed">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-400/15 font-mono text-xs text-violet-200">
                {i + 1}
              </span>
              {idea}
            </li>
          ))}
        </ol>
      </TabsContent>
      <TabsContent value="problem" className="flex flex-col gap-3 pt-1 leading-relaxed">
        {problem.description.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {problem.examples?.map((ex, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <p className="font-semibold">Example {i + 1}:</p>
            <div className="overflow-x-auto rounded-lg border border-border bg-zinc-950/60 p-3 font-mono text-[12.5px] leading-relaxed">
              <p className="text-muted-foreground">Input:</p>
              <pre className="whitespace-pre text-zinc-200">{ex.input}</pre>
              <p className="mt-2">
                <span className="text-muted-foreground">Output: </span>
                <span className="text-emerald-300">{ex.output}</span>
              </p>
              {ex.explanation && (
                <>
                  <p className="mt-2 text-muted-foreground">Explanation:</p>
                  <pre className="whitespace-pre text-zinc-200">{ex.explanation}</pre>
                </>
              )}
            </div>
          </div>
        ))}
        {problem.constraints && problem.constraints.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="font-semibold">Constraints:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {problem.constraints.map((c, i) => (
                <li key={i}>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12.5px]">{c}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        {problem.followUp && (
          <p>
            <span className="font-semibold">Follow up:</span> {problem.followUp}
          </p>
        )}
        <a href={problem.url} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:underline">
          Open this problem on LeetCode →
        </a>
      </TabsContent>
    </Tabs>
  </aside>
  );

  return (
    <div className={cn("mx-auto flex w-full flex-1 flex-col gap-4 px-4 py-5 sm:px-6", isDesktop ? "h-dvh min-h-0 gap-3 py-4" : "max-w-[1400px]")}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/"
            aria-label="Back to all problems"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "mt-0.5")}
          >
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              <span className="text-muted-foreground">{problem.number}.</span> {problem.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <DifficultyBadge difficulty={problem.difficulty} />
              <Badge variant="outline" className="border-violet-400/40 text-violet-200">
                {problem.pattern}
              </Badge>
              {problem.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start sm:self-center")}
        >
          Open on LeetCode <ExternalLink />
        </a>
      </header>

      {isDesktop ? (
        <ResizableWorkspace input={inputCard} canvas={canvasCard} controls={controlsCard} side={sidePanel} />
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          {inputCard}
          {canvasCard}
          {controlsCard}
          {sidePanel}
        </div>
      )}
    </div>
  );
}
