import type { ReactNode } from "react";

import { isElectron } from "~/env";
import { cn } from "~/lib/utils";

import { Skeleton } from "./ui/skeleton";

export type EditorPanelMode = "inline" | "sheet" | "sidebar";

function getEditorPanelHeaderRowClassName(mode: EditorPanelMode) {
  const shouldUseDragRegion = isElectron && mode !== "sheet";
  return cn(
    "flex items-center justify-between gap-2 px-4",
    shouldUseDragRegion ? "drag-region h-[52px] border-b border-border" : "h-12",
  );
}

export function EditorPanelShell(props: {
  mode: EditorPanelMode;
  header: ReactNode;
  children: ReactNode;
}) {
  const shouldUseDragRegion = isElectron && props.mode !== "sheet";

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col bg-background",
        props.mode === "inline"
          ? "w-[42vw] min-w-[360px] max-w-[560px] shrink-0 border-l border-border"
          : "w-full",
      )}
    >
      {shouldUseDragRegion ? (
        <div className={getEditorPanelHeaderRowClassName(props.mode)}>{props.header}</div>
      ) : (
        <div className="border-b border-border">
          <div className={getEditorPanelHeaderRowClassName(props.mode)}>{props.header}</div>
        </div>
      )}
      {props.children}
    </div>
  );
}

export function EditorPanelHeaderSkeleton() {
  return (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex gap-1 overflow-hidden px-0 py-0.5">
          <Skeleton className="h-6 w-32 shrink-0 rounded-md" />
          <Skeleton className="h-6 w-24 shrink-0 rounded-md" />
          <Skeleton className="h-6 w-24 shrink-0 rounded-md max-sm:hidden" />
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Skeleton className="size-7 rounded-md" />
      </div>
    </>
  );
}

export function EditorPanelLoadingState(props: { label: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/60 bg-card/25"
        role="status"
        aria-live="polite"
        aria-label={props.label}
      >
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="ml-auto size-7 rounded-md" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 py-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-3 w-10/12 rounded-full" />
            <Skeleton className="h-3 w-11/12 rounded-full" />
            <Skeleton className="h-3 w-9/12 rounded-full" />
          </div>
          <span className="sr-only">{props.label}</span>
        </div>
      </div>
    </div>
  );
}
