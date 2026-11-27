"use client";

import { useSyncExternalStore } from "react";

/** Problem slug → when it was marked done, in ms since the epoch. */
export type DoneMap = Record<string, number>;

// progress.json in the project folder is the source of truth; localStorage is a fast-loading backup.
const STORAGE_KEY = "coding-interview-visualized:done";
const EMPTY: DoneMap = {};

let state: DoneMap = EMPTY;
let loaded = false;
let toggledBeforeLoad = false;
let loadFinished = false;
let saving: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function parse(raw: string | null): DoneMap {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, at]) => typeof at === "number"));
  } catch {
    return {};
  }
}

function setState(next: DoneMap) {
  state = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

function saveToFile(done: DoneMap) {
  saving = saving
    .then(async () => {
      const res = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(done),
      });
      if (!res.ok) throw new Error(`Saving progress failed with status ${res.status}`);
    })
    .catch((e) => console.error(e));
}

async function load() {
  state = parse(window.localStorage.getItem(STORAGE_KEY));
  listeners.forEach((l) => l());
  try {
    const res = await fetch("/api/progress");
    if (!res.ok) throw new Error(`Loading progress failed with status ${res.status}`);
    const fromFile = ((await res.json()) as { done: DoneMap }).done;
    if (toggledBeforeLoad) return;
    if (Object.keys(fromFile).length === 0 && Object.keys(state).length > 0) {
      saveToFile(state);
    } else {
      setState(fromFile);
    }
  } catch (e) {
    console.error(e);
  } finally {
    loadFinished = true;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!loaded) {
    loaded = true;
    void load();
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    state = parse(e.newValue);
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Problems marked done. Empty during server rendering and until the first load. */
export function useDoneProblems(): DoneMap {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

export function toggleDone(slug: string) {
  if (!loadFinished) toggledBeforeLoad = true;
  const next = { ...state };
  if (slug in next) delete next[slug];
  else next[slug] = Date.now();
  setState(next);
  saveToFile(next);
}
