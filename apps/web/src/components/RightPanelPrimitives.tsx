/**
 * Shared primitives for right-side panels (Editor, Diff, Browser…).
 *
 * Each panel reuses the same sidebar/sheet/width-guard plumbing.
 * To add a new panel (e.g. Browser), import `RightPanelInlineSidebar`,
 * `RightPanelSheet`, and `shouldAcceptPanelWidth` — no need to duplicate
 * the width-checking logic or the Sheet wrapper.
 */
import { type ReactNode, useCallback } from "react";

import { Sheet, SheetPopup } from "~/components/ui/sheet";
import { Sidebar, SidebarRail, SidebarProvider } from "~/components/ui/sidebar";

// ─── Width guard shared by all inline sidebars ──────────────────────────

const COMPOSER_COMPACT_MIN_LEFT_CONTROLS_WIDTH_PX = 208;

/**
 * Reusable width-acceptance callback for any right-side inline sidebar.
 * Ensures the composer never gets squished below its minimum viable width.
 */
export function shouldAcceptPanelWidth({
  nextWidth,
  wrapper,
}: {
  nextWidth: number;
  wrapper: HTMLElement;
}): boolean {
  const composerForm = document.querySelector<HTMLElement>("[data-chat-composer-form='true']");
  if (!composerForm) return true;
  const composerViewport = composerForm.parentElement;
  if (!composerViewport) return true;

  const previousSidebarWidth = wrapper.style.getPropertyValue("--sidebar-width");
  wrapper.style.setProperty("--sidebar-width", `${nextWidth}px`);

  const viewportStyle = window.getComputedStyle(composerViewport);
  const viewportPaddingLeft = Number.parseFloat(viewportStyle.paddingLeft) || 0;
  const viewportPaddingRight = Number.parseFloat(viewportStyle.paddingRight) || 0;
  const viewportContentWidth = Math.max(
    0,
    composerViewport.clientWidth - viewportPaddingLeft - viewportPaddingRight,
  );
  const formRect = composerForm.getBoundingClientRect();
  const composerFooter = composerForm.querySelector<HTMLElement>(
    "[data-chat-composer-footer='true']",
  );
  const composerRightActions = composerForm.querySelector<HTMLElement>(
    "[data-chat-composer-actions='right']",
  );
  const composerRightActionsWidth = composerRightActions?.getBoundingClientRect().width ?? 0;
  const composerFooterGap = composerFooter
    ? Number.parseFloat(window.getComputedStyle(composerFooter).columnGap) ||
      Number.parseFloat(window.getComputedStyle(composerFooter).gap) ||
      0
    : 0;
  const minimumComposerWidth =
    COMPOSER_COMPACT_MIN_LEFT_CONTROLS_WIDTH_PX + composerRightActionsWidth + composerFooterGap;
  const hasComposerOverflow = composerForm.scrollWidth > composerForm.clientWidth + 0.5;
  const overflowsViewport = formRect.width > viewportContentWidth + 0.5;
  const violatesMinimumComposerWidth = composerForm.clientWidth + 0.5 < minimumComposerWidth;

  if (previousSidebarWidth.length > 0) {
    wrapper.style.setProperty("--sidebar-width", previousSidebarWidth);
  } else {
    wrapper.style.removeProperty("--sidebar-width");
  }

  return !hasComposerOverflow && !overflowsViewport && !violatesMinimumComposerWidth;
}

// ─── Generic inline sidebar wrapper ─────────────────────────────────────

export interface RightPanelInlineSidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  defaultWidth: string;
  minWidth: number;
  storageKey: string;
  children: ReactNode;
}

export function RightPanelInlineSidebar({
  open,
  onClose,
  onOpen,
  defaultWidth,
  minWidth,
  storageKey,
  children,
}: RightPanelInlineSidebarProps) {
  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpen();
      } else {
        onClose();
      }
    },
    [onClose, onOpen],
  );

  return (
    <SidebarProvider
      defaultOpen={false}
      open={open}
      onOpenChange={onOpenChange}
      className="w-auto min-h-0 flex-none bg-transparent"
      style={{ "--sidebar-width": defaultWidth } as React.CSSProperties}
    >
      <Sidebar
        side="right"
        collapsible="offcanvas"
        className="border-l border-border bg-card text-foreground"
        resizable={{
          minWidth,
          shouldAcceptWidth: shouldAcceptPanelWidth,
          storageKey,
        }}
      >
        {children}
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}

// ─── Generic sheet wrapper ──────────────────────────────────────────────

export interface RightPanelSheetProps {
  open: boolean;
  onClose: () => void;
  /** Max CSS width string, e.g. "min(88vw,820px)". */
  maxWidth?: string;
  children: ReactNode;
}

export function RightPanelSheet({
  open,
  onClose,
  maxWidth = "min(88vw,820px)",
  children,
}: RightPanelSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <SheetPopup
        side="right"
        showCloseButton={false}
        keepMounted
        className={`w-[${maxWidth}] max-w-[820px] p-0`}
      >
        {children}
      </SheetPopup>
    </Sheet>
  );
}

// ─── Helpers for search-param retention ─────────────────────────────────

/**
 * Common right-panel search param keys.
 * Each panel adds its own entries; merge them in the route config.
 */
export const DIFF_PANEL_SEARCH_PARAMS = ["diff", "diffTurnId", "diffFilePath"] as const;
export const EDITOR_PANEL_SEARCH_PARAMS = ["editor", "editorFilePath"] as const;
