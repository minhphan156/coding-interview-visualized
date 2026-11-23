"use client";

import { useDefaultLayout } from "react-resizable-panels";
import { useSyncExternalStore } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function Handle({ className }: { className?: string }) {
  return (
    <ResizableHandle
      withHandle
      className={cn(
        "bg-transparent transition-colors hover:[&>div]:bg-violet-400 focus-visible:[&>div]:bg-violet-400",
        "w-3 aria-[orientation=horizontal]:h-3 [&>div]:h-10 [&>div]:bg-zinc-700",
        className,
      )}
    />
  );
}

type Slots = {
  input: React.ReactNode;
  canvas: React.ReactNode;
  controls: React.ReactNode;
  side: React.ReactNode;
};

export function ResizableWorkspace({ input, canvas, controls, side }: Slots) {
  const main = useDefaultLayout({ id: "viz-main", onlySaveAfterUserInteractions: true });
  const left = useDefaultLayout({ id: "viz-left", onlySaveAfterUserInteractions: true });

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      defaultLayout={main.defaultLayout}
      onLayoutChanged={main.onLayoutChanged}
      className="min-h-0 flex-1"
    >
      <ResizablePanel id="left" defaultSize="64" minSize={420}>
        <ResizablePanelGroup
          orientation="vertical"
          defaultLayout={left.defaultLayout}
          onLayoutChanged={left.onLayoutChanged}
        >
          <ResizablePanel id="input" defaultSize={118} minSize={84}>
            {input}
          </ResizablePanel>
          <Handle />
          <ResizablePanel id="canvas" minSize={200}>
            {canvas}
          </ResizablePanel>
          <Handle />
          <ResizablePanel id="controls" defaultSize={136} minSize={96}>
            {controls}
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <Handle />
      <ResizablePanel id="side" defaultSize="36" minSize={300}>
        {side}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
