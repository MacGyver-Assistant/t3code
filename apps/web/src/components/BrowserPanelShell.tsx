import type { ReactNode } from "react";

import { isElectron } from "~/env";
import { cn } from "~/lib/utils";

import { Skeleton } from "./ui/skeleton";

export type BrowserPanelMode = "inline" | "sheet" | "sidebar";

function getBrowserPanelHeaderRowClassName(mode: BrowserPanelMode) {
  const shouldUseDragRegion = isElectron && mode !== "sheet";
  return cn(
    "flex items-center gap-1.5 px-3",
    shouldUseDragRegion ? "drag-region h-[52px] border-b border-border" : "h-10",
  );
}

export function BrowserPanelShell(props: {
  mode: BrowserPanelMode;
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
      role="region"
      aria-label="Browser preview panel"
    >
      {shouldUseDragRegion ? (
        <div className={getBrowserPanelHeaderRowClassName(props.mode)}>{props.header}</div>
      ) : (
        <div className="border-b border-border">
          <div className={getBrowserPanelHeaderRowClassName(props.mode)}>{props.header}</div>
        </div>
      )}
      <div className="relative flex-1 min-h-0">{props.children}</div>
    </div>
  );
}

export function BrowserPanelHeaderSkeleton() {
  return (
    <>
      <div className="flex gap-1">
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="size-6 rounded-md" />
      </div>
      <Skeleton className="flex-1 h-7 rounded-md" />
      <Skeleton className="size-7 rounded-md" />
    </>
  );
}

export function BrowserPanelLoadingState(props: { label: string }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 px-6"
      role="status"
      aria-live="polite"
      aria-label={props.label}
    >
      <div className="space-y-2 w-full max-w-xs">
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-10/12 rounded-full" />
        <Skeleton className="h-3 w-8/12 rounded-full" />
      </div>
      <span className="sr-only">{props.label}</span>
    </div>
  );
}
