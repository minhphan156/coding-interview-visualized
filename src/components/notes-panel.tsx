"use client";

import { Check, CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const SAVE_DELAY_MS = 500;

type Status = "loading" | "saved" | "saving" | "error";

const backupKey = (slug: string) => `coding-interview-visualized:notes:${slug}`;
// Notes written before the rename live under the project's old name; read them once so they move into the file.
const legacyBackupKey = (slug: string) => `leetcode-visualization:notes:${slug}`;

function readBackup(slug: string): string {
  return window.localStorage.getItem(backupKey(slug)) ?? window.localStorage.getItem(legacyBackupKey(slug)) ?? "";
}

async function saveToFile(slug: string, content: string, keepalive = false) {
  const res = await fetch(`/api/notes/${slug}`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
    keepalive,
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Save failed");
}

export function NotesPanel({ slug, title }: { slug: string; title: string }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(
    async (keepalive = false) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const content = pending.current;
      if (content === null) return;
      pending.current = null;
      try {
        await saveToFile(slug, content, keepalive);
        if (pending.current === null) setStatus("saved");
        setError(null);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Save failed");
      }
    },
    [slug],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/notes/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Couldn't load the note file.");
        return ((await res.json()) as { content: string }).content;
      })
      .then((fromFile) => {
        if (cancelled) return;
        const backup = readBackup(slug);
        if (!fromFile && backup) {
          setNote(backup);
          pending.current = backup;
          void flush();
        } else {
          setNote(fromFile);
          setStatus("saved");
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setNote(readBackup(slug));
        setStatus("error");
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, flush]);

  useEffect(() => {
    const onHide = () => void flush(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush(true);
    };
  }, [flush]);

  const update = (next: string) => {
    setNote(next);
    if (next) window.localStorage.setItem(backupKey(slug), next);
    else window.localStorage.removeItem(backupKey(slug));
    window.localStorage.removeItem(legacyBackupKey(slug));
    pending.current = next;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };

  const words = note.trim() ? note.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-muted-foreground">
          Saved to <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">notes/{slug}.md</code> in the
          project folder.
        </p>
        <Button
          size="xs"
          variant="ghost"
          disabled={!note || status === "loading"}
          onClick={() => {
            if (window.confirm("Delete your notes for this problem?")) update("");
          }}
        >
          <Trash2 />
          Clear
        </Button>
      </div>
      <textarea
        value={note}
        onChange={(e) => update(e.target.value)}
        disabled={status === "loading"}
        placeholder={status === "loading" ? "Loading your notes…" : "Write it in your own words…\n\n• The trick I keep forgetting\n• Edge cases to check\n• How I'd explain it in an interview"}
        spellCheck
        aria-label={`Notes for ${title}`}
        className="min-h-80 flex-1 resize-y rounded-lg border border-input bg-zinc-950/60 p-3 font-mono text-[13px] leading-relaxed text-zinc-100 outline-none placeholder:text-muted-foreground/50 focus:border-ring focus:ring-3 focus:ring-ring/40 disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1" aria-live="polite">
          {status === "loading" && (
            <>
              <LoaderCircle className="size-3 animate-spin" /> Loading…
            </>
          )}
          {status === "saving" && (
            <>
              <LoaderCircle className="size-3 animate-spin" /> Saving…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="size-3 text-emerald-400" /> Saved to file
            </>
          )}
          {status === "error" && (
            <span className="flex items-center gap-1 text-rose-300">
              <CircleAlert className="size-3" /> {error ?? "Couldn't save to the file."} Kept in this browser for now.
            </span>
          )}
        </span>
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
      </div>
    </div>
  );
}
