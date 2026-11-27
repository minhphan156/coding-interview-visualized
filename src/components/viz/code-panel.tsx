"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const KEYWORDS = new Set([
  "and", "as", "break", "class", "continue", "def", "elif", "else", "for", "from", "if", "import",
  "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass", "return", "self", "True", "False",
  "while", "with", "yield", "global", "try", "except", "finally", "raise",
  "const", "let", "var", "function", "new", "of", "true", "false", "null", "undefined", "type",
  "interface", "this", "typeof", "do", "switch", "case", "default", "throw", "catch", "export",
]);
const BUILTINS = new Set([
  "len", "range", "enumerate", "min", "max", "sum", "sorted", "abs", "zip", "list", "dict", "set",
  "int", "str", "List", "Optional", "deque", "heapq", "defaultdict", "Counter", "float", "map",
  "Math", "Map", "Set", "Array", "string", "number", "boolean", "length", "push", "pop",
]);

const TOKEN = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;

export function highlight(line: string) {
  const parts: React.ReactNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    const [text, comment, str, num, ident] = m;
    let cls = "";
    if (comment) cls = "text-zinc-500 italic";
    else if (str) cls = "text-emerald-300";
    else if (num) cls = "text-orange-300";
    else if (ident && KEYWORDS.has(ident)) cls = "text-violet-300";
    else if (ident && BUILTINS.has(ident)) cls = "text-sky-300";
    else if (ident && line.slice(m.index + text.length).startsWith("(")) cls = "text-amber-200";
    parts.push(
      <span key={i++} className={cls}>
        {text}
      </span>,
    );
  }
  return parts;
}

type Props = {
  code: string;
  activeLine: number;
  recallMode: boolean;
  revealedLines: Set<number>;
  className?: string;
};

export function CodePanel({ code, activeLine, recallMode, revealedLines, className }: Props) {
  const lines = code.split("\n");
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const line = activeRef.current;
    if (!panel || !line) return;
    if (panel.scrollHeight <= panel.clientHeight) {
      line.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    // The panel scrolls on its own, so keep the active line in view without moving the page.
    const top = line.offsetTop;
    if (top < panel.scrollTop || top + line.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTo({ top: top - panel.clientHeight / 3, behavior: "smooth" });
    }
  }, [activeLine]);

  return (
    <div ref={panelRef} className={cn("relative overflow-x-auto rounded-lg bg-zinc-950/80 py-3 font-mono text-[13px] leading-6 ring-1 ring-border", className)}>
      {lines.map((line, idx) => {
        const n = idx + 1;
        const active = n === activeLine;
        const hidden = recallMode && !revealedLines.has(n) && /\w/.test(line);
        return (
          <div key={n} ref={active ? activeRef : undefined} className="relative flex min-w-max pr-4">
            {active && (
              <motion.div
                layoutId="code-active-line"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 border-l-2 border-amber-400 bg-amber-400/12"
              />
            )}
            <span
              className={cn(
                "relative w-10 shrink-0 pr-3 text-right select-none",
                active ? "text-amber-300" : "text-zinc-600",
              )}
            >
              {n}
            </span>
            <span
              className={cn(
                "relative whitespace-pre text-zinc-200 transition-[filter,opacity] duration-500",
                hidden && "opacity-60 blur-[5px] select-none",
              )}
            >
              {highlight(line)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
