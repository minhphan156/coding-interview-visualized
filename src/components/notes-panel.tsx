"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const CHANGE_EVENT = "lc-notes-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function useNote(slug: string) {
  const key = `leetcode-visualization:notes:${slug}`;
  const value = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key) ?? "",
    () => "",
  );
  const setValue = useCallback(
    (next: string) => {
      if (next) window.localStorage.setItem(key, next);
      else window.localStorage.removeItem(key);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );
  return [value, setValue] as const;
}

export function NotesPanel({ slug, title }: { slug: string; title: string }) {
  const [note, setNote] = useNote(slug);
  const words = note.trim() ? note.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Your notes for <span className="text-foreground">{title}</span>, saved in this browser as you type.
        </p>
        <Button
          size="xs"
          variant="ghost"
          disabled={!note}
          onClick={() => {
            if (window.confirm("Delete your notes for this problem?")) setNote("");
          }}
        >
          <Trash2 />
          Clear
        </Button>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={"Write it in your own words…\n\n• The trick I keep forgetting\n• Edge cases to check\n• How I'd explain it in an interview"}
        spellCheck
        aria-label={`Notes for ${title}`}
        className="min-h-80 flex-1 resize-y rounded-lg border border-input bg-zinc-950/60 p-3 font-mono text-[13px] leading-relaxed text-zinc-100 outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-3 focus:ring-ring/40"
      />
      <p className="text-right font-mono text-[11px] text-muted-foreground">
        {words} {words === 1 ? "word" : "words"}
      </p>
    </div>
  );
}
