import { TriangleAlert } from "lucide-react";
import { highlight } from "@/components/viz/code-panel";
import { cn } from "@/lib/utils";
import type { Problem } from "@/lib/viz/types";

function Section({
  label,
  title,
  accent,
  children,
}: {
  label: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-baseline gap-2">
        <span className={cn("font-mono text-xs font-bold tracking-widest", accent)}>{label}</span>
        <span className="text-xs text-muted-foreground">{title}</span>
      </h3>
      {children}
    </section>
  );
}

export function StudyGuide({ problem, languageName }: { problem: Problem; languageName: string }) {
  const { why, what, how, pitfalls } = problem.guide;
  return (
    <div className="flex flex-col gap-5 leading-relaxed">
      <Section label="WHY" title="why this problem exists" accent="text-violet-300">
        <p>{why.intro}</p>
        <ol className="flex flex-col gap-1.5">
          {why.points.map((point, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-400/15 font-mono text-[11px] text-violet-200">
                {i + 1}
              </span>
              {point}
            </li>
          ))}
        </ol>
        {why.analogy && (
          <p className="rounded-lg border border-violet-400/25 bg-violet-400/10 px-3 py-2 text-violet-100">{why.analogy}</p>
        )}
      </Section>

      <Section label="WHAT" title="what it's asking" accent="text-sky-300">
        <p>{what.summary}</p>
        {what.examples && what.examples.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border border-border bg-zinc-950/60 px-3 py-2 font-mono text-[12.5px]">
            {what.examples.map((ex, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="text-zinc-200">{ex.text}</span>
                {ex.note && <span className="text-sky-300/90">← {ex.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section label="HOW" title="how to solve it" accent="text-amber-300">
        <p>{how.insight}</p>
        <div className="overflow-x-auto rounded-lg border border-border bg-zinc-950/80">
          <div className="border-b border-border px-3 py-1 font-mono text-[11px] text-muted-foreground">
            {languageName}
          </div>
          <pre className="px-3 py-2 font-mono text-[12.5px] leading-6 text-zinc-200">
            {problem.code.split("\n").map((line, i) => (
              <div key={i} className="whitespace-pre">
                {highlight(line)}
                {line === "" && " "}
              </div>
            ))}
          </pre>
        </div>
      </Section>

      <Section label="COMPLEXITY" title="time and space" accent="text-emerald-300">
        <p>
          Time <span className="font-mono font-semibold text-emerald-200">{problem.complexity.time}</span>, Space{" "}
          <span className="font-mono font-semibold text-emerald-200">{problem.complexity.space}</span>.
        </p>
      </Section>

      <Section label="PITFALL" title="to avoid" accent="text-rose-300">
        <ul className="flex flex-col gap-2">
          {pitfalls.map((p, i) => (
            <li key={i} className="flex gap-2.5 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-rose-50">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
              {p}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
