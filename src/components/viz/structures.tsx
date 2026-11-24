"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ArrayViz, GridViz, MapViz, StackViz, VarsViz, Viz } from "@/lib/viz/types";
import { barTone, cellTone, formatValue, pointerTone, spanTone } from "./tones";

const spring = { type: "spring", stiffness: 420, damping: 32 } as const;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </div>
  );
}

function ArrayBoxes({ viz }: { viz: ArrayViz }) {
  const pointers = viz.pointers ?? [];
  return (
    <div className="overflow-x-auto pb-1">
      {viz.values.length === 0 && (
        <div className="flex h-12 w-28 items-center justify-center rounded-lg border border-dashed border-border font-mono text-sm text-muted-foreground">
          empty
        </div>
      )}
      <div className="flex w-max gap-1.5">
        {viz.values.map((v, i) => {
          const tone = viz.tones?.[i];
          const here = pointers.filter((p) => p.index === i);
          return (
            <div key={i} className="flex w-11 flex-col items-center gap-1 sm:w-12">
              <span className="font-mono text-[10px] text-muted-foreground">{i}</span>
              <motion.div
                layoutId={viz.ids ? `${viz.id}-cell-${viz.ids[i]}` : undefined}
                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                animate={{ opacity: 1, y: 0, scale: tone === "active" || tone === "found" ? 1.08 : 1 }}
                transition={spring}
                className={cn(
                  "flex size-11 items-center justify-center rounded-lg border-2 font-mono text-base font-semibold transition-colors duration-300 sm:size-12",
                  cellTone[tone ?? "default"],
                )}
              >
                {formatValue(v)}
              </motion.div>
              <div className="flex min-h-6 flex-col items-center gap-0.5">
                {here.map((p) => (
                  <motion.div
                    key={p.name}
                    layoutId={`${viz.id}-ptr-${p.name}`}
                    transition={spring}
                    className={cn(
                      "flex flex-col items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] leading-tight font-bold",
                      pointerTone[p.tone ?? "default"],
                    )}
                  >
                    <span className="text-[9px] leading-none">▲</span>
                    {p.name}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArrayBars({ viz }: { viz: ArrayViz }) {
  const values = viz.values.map((v) => (typeof v === "number" ? v : 0));
  const max = Math.max(1, ...values);
  const n = values.length;
  const pointers = viz.pointers ?? [];
  const span = viz.span;
  return (
    <div>
      <div className="relative flex h-48 items-end gap-1 border-b border-border sm:h-56">
        <AnimatePresence>
          {span && span.to > span.from && (
            <motion.div
              key="span"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                left: `${((span.from + 0.5) / n) * 100}%`,
                width: `${((span.to - span.from) / n) * 100}%`,
                height: `${((span.height ?? 0) / max) * 100}%`,
              }}
              exit={{ opacity: 0 }}
              transition={spring}
              className={cn("absolute bottom-0 rounded-t-sm border-t-2", spanTone[span.tone ?? "default"])}
            />
          )}
        </AnimatePresence>
        {values.map((v, i) => (
          <div key={i} className="relative flex h-full flex-1 flex-col items-center justify-end">
            <span className="mb-1 font-mono text-[11px] text-muted-foreground">{v}</span>
            <motion.div
              animate={{ height: `${(v / max) * 100}%` }}
              transition={spring}
              className={cn(
                "w-full max-w-10 min-h-0.5 rounded-t-md transition-colors duration-300",
                barTone[viz.tones?.[i] ?? "default"],
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {values.map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5 pt-1">
            <span className="font-mono text-[10px] text-muted-foreground">{i}</span>
            {pointers
              .filter((p) => p.index === i)
              .map((p) => (
                <motion.div
                  key={p.name}
                  layoutId={`${viz.id}-ptr-${p.name}`}
                  transition={spring}
                  className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold", pointerTone[p.tone ?? "default"])}
                >
                  {p.name}
                </motion.div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapView({ viz }: { viz: MapViz }) {
  return (
    <div className="flex min-h-12 flex-wrap gap-2">
      {viz.entries.length === 0 && (
        <div className="flex h-11 items-center rounded-lg border border-dashed border-border px-3 font-mono text-sm text-muted-foreground">
          {"{ }"} empty
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {viz.entries.map(([k, v]) => {
          const tone = viz.tones?.[String(k)];
          return (
            <motion.div
              key={String(k)}
              layout
              initial={{ opacity: 0, scale: 0.6, y: -8 }}
              animate={{ opacity: 1, scale: tone === "found" ? 1.08 : 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={spring}
              className={cn(
                "flex items-stretch overflow-hidden rounded-lg border-2 font-mono text-sm transition-colors duration-300",
                cellTone[tone ?? "default"],
              )}
            >
              <span className="px-2.5 py-2 font-semibold">{formatValue(k)}</span>
              <span className="border-l border-current/20 bg-black/20 px-2.5 py-2 text-muted-foreground">
                {formatValue(v)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function StackView({ viz }: { viz: StackViz }) {
  const items = viz.items;
  return (
    <div className="flex w-full max-w-56 flex-col-reverse gap-1.5 rounded-b-xl border-x-2 border-b-2 border-border p-1.5 pt-6">
      {items.length === 0 && (
        <div className="py-2 text-center font-mono text-xs text-muted-foreground">empty</div>
      )}
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const isTop = i === items.length - 1;
          const tone = isTop ? viz.topTone : undefined;
          return (
            <motion.div
              key={`${i}-${String(item)}`}
              layout
              initial={{ opacity: 0, y: -28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -28, transition: { duration: 0.18 } }}
              transition={spring}
              className={cn(
                "relative rounded-md border-2 px-3 py-1.5 text-center font-mono text-sm font-semibold transition-colors duration-300",
                cellTone[tone ?? "default"],
              )}
            >
              {formatValue(item)}
              {isTop && (
                <span className="absolute top-1/2 -right-12 -translate-y-1/2 font-mono text-[10px] font-normal text-muted-foreground">
                  ← top
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function GridView({ viz }: { viz: GridViz }) {
  const cols = viz.cells[0]?.length ?? 0;
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${cols}, minmax(0, 1fr))` }}>
        <span />
        {Array.from({ length: cols }, (_, c) => (
          <span key={c} className="text-center font-mono text-[10px] text-muted-foreground">
            {c}
          </span>
        ))}
        {viz.cells.map((row, r) => (
          <div key={r} className="contents">
            <span className="flex items-center pr-1 font-mono text-[10px] text-muted-foreground">{r}</span>
            {row.map((cell, c) => {
              const tone = viz.tones?.[`${r},${c}`];
              const isCursor = viz.cursor?.r === r && viz.cursor?.c === c;
              return (
                <motion.div
                  key={c}
                  animate={{ scale: isCursor ? 1.1 : 1 }}
                  transition={spring}
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-md border-2 font-mono text-sm font-semibold transition-colors duration-300 sm:size-10",
                    cellTone[tone ?? "default"],
                  )}
                >
                  {formatValue(cell)}
                  {isCursor && (
                    <motion.span
                      layoutId={`${viz.id}-cursor`}
                      transition={spring}
                      className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-white/80"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function VarsView({ viz }: { viz: VarsViz }) {
  const entries = Object.entries(viz.vars);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => {
        const changed = viz.changed?.includes(k);
        return (
          <div
            key={k}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-sm transition-colors duration-300",
              changed ? "border-amber-400/70 bg-amber-400/10" : "border-border bg-card",
            )}
          >
            <span className="text-muted-foreground">{k}</span>
            <span className="text-muted-foreground/50">=</span>
            <motion.span
              key={formatValue(v)}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("font-semibold", changed && "text-amber-200")}
            >
              {formatValue(v)}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}

export function StructureView({ viz }: { viz: Viz }) {
  return (
    <section>
      <Label>{viz.label}</Label>
      {viz.kind === "array" && (viz.display === "bars" ? <ArrayBars viz={viz} /> : <ArrayBoxes viz={viz} />)}
      {viz.kind === "map" && <MapView viz={viz} />}
      {viz.kind === "stack" && <StackView viz={viz} />}
      {viz.kind === "grid" && <GridView viz={viz} />}
      {viz.kind === "vars" && <VarsView viz={viz} />}
    </section>
  );
}
