import { ThreadId } from "@t3tools/contracts";
import { createFileRoute, retainSearchParams, useNavigate } from "@tanstack/react-router";
import { Suspense, lazy, type ReactNode, useCallback, useEffect, useState } from "react";

import ChatView from "../components/ChatView";
import { DiffWorkerPoolProvider } from "../components/DiffWorkerPoolProvider";
import {
  DiffPanelHeaderSkeleton,
  DiffPanelLoadingState,
  DiffPanelShell,
  type DiffPanelMode,
} from "../components/DiffPanelShell";
import {
  EditorPanelHeaderSkeleton,
  EditorPanelLoadingState,
  EditorPanelShell,
  type EditorPanelMode,
} from "../components/EditorPanelShell";
import {
  BrowserPanelHeaderSkeleton,
  BrowserPanelLoadingState,
  BrowserPanelShell,
  type BrowserPanelMode,
} from "../components/BrowserPanelShell";
import {
  RightPanelInlineSidebar,
  RightPanelSheet,
  DIFF_PANEL_SEARCH_PARAMS,
  EDITOR_PANEL_SEARCH_PARAMS,
} from "../components/RightPanelPrimitives";
import { useComposerDraftStore } from "../composerDraftStore";
import {
  type DiffRouteSearch,
  parseDiffRouteSearch,
  stripDiffSearchParams,
} from "../diffRouteSearch";
import {
  type EditorRouteSearch,
  parseEditorRouteSearch,
  stripEditorSearchParams,
} from "../editorRouteSearch";
import {
  type BrowserRouteSearch,
  parseBrowserRouteSearch,
  stripBrowserSearchParams,
} from "../browserRouteSearch";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useStore } from "../store";
import { Sheet, SheetPopup } from "../components/ui/sheet";
import { Sidebar, SidebarInset, SidebarProvider, SidebarRail } from "~/components/ui/sidebar";

const DiffPanel = lazy(() => import("../components/DiffPanel"));
const EditorPanel = lazy(() => import("../components/EditorPanel"));
const BrowserPanel = lazy(() => import("../components/BrowserPanel"));

const INLINE_LAYOUT_MEDIA_QUERY = "(max-width: 1180px)";
const DIFF_INLINE_SIDEBAR_WIDTH_STORAGE_KEY = "chat_diff_sidebar_width";
const EDITOR_INLINE_SIDEBAR_WIDTH_STORAGE_KEY = "chat_editor_sidebar_width";
const PANEL_INLINE_DEFAULT_WIDTH = "clamp(28rem,48vw,44rem)";
const PANEL_INLINE_MIN_WIDTH = 26 * 16; // 416px

const COMPOSER_COMPACT_MIN_LEFT_CONTROLS_WIDTH_PX = 208;

const BROWSER_INLINE_SIDEBAR_WIDTH_STORAGE_KEY = "chat_browser_sidebar_width";
const BROWSER_INLINE_DEFAULT_WIDTH = "clamp(28rem,48vw,44rem)";
const BROWSER_INLINE_SIDEBAR_MIN_WIDTH = 26 * 16;

// ─── Lazy panel wrappers ─────────────────────────────────────────────────

const DiffLoadingFallback = (props: { mode: DiffPanelMode }) => (
  <DiffPanelShell mode={props.mode} header={<DiffPanelHeaderSkeleton />}>
    <DiffPanelLoadingState label="Loading diff viewer..." />
  </DiffPanelShell>
);

const EditorLoadingFallback = (props: { mode: EditorPanelMode }) => (
  <EditorPanelShell mode={props.mode} header={<EditorPanelHeaderSkeleton />}>
    <EditorPanelLoadingState label="Loading editor..." />
  </EditorPanelShell>
);

const LazyDiffPanel = (props: { mode: DiffPanelMode }) => (
  <DiffWorkerPoolProvider>
    <Suspense fallback={<DiffLoadingFallback mode={props.mode} />}>
      <DiffPanel mode={props.mode} />
    </Suspense>
  </DiffWorkerPoolProvider>
);

const LazyEditorPanel = (props: { mode: EditorPanelMode }) => (
  <Suspense fallback={<EditorLoadingFallback mode={props.mode} />}>
    <EditorPanel mode={props.mode} />
  </Suspense>
);

// ─── Route component ─────────────────────────────────────────────────────

const BrowserPanelSheet = (props: {
  children: ReactNode;
  browserOpen: boolean;
  onCloseBrowser: () => void;
}) => {
  return (
    <Sheet
      open={props.browserOpen}
      onOpenChange={(open) => {
        if (!open) {
          props.onCloseBrowser();
        }
      }}
    >
      <SheetPopup
        side="right"
        showCloseButton={false}
        keepMounted
        className="w-[min(92vw,820px)] max-w-[820px] p-0"
      >
        {props.children}
      </SheetPopup>
    </Sheet>
  );
};

const BrowserLoadingFallback = (props: { mode: BrowserPanelMode }) => {
  return (
    <BrowserPanelShell mode={props.mode} header={<BrowserPanelHeaderSkeleton />}>
      <BrowserPanelLoadingState label="Loading browser panel..." />
    </BrowserPanelShell>
  );
};

const LazyBrowserPanel = (props: { mode: BrowserPanelMode; onClosePanel: () => void; initialUrl?: string | undefined }) => {
  return (
    <Suspense fallback={<BrowserLoadingFallback mode={props.mode} />}>
      <BrowserPanel mode={props.mode} onClosePanel={props.onClosePanel} initialUrl={props.initialUrl} />
    </Suspense>
  );
};

const BrowserPanelInlineSidebar = (props: {
  browserOpen: boolean;
  onCloseBrowser: () => void;
  onOpenBrowser: () => void;
  renderBrowserContent: boolean;
  browserUrl?: string | undefined;
}) => {
  const { browserOpen, onCloseBrowser, onOpenBrowser, renderBrowserContent, browserUrl } = props;
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        onOpenBrowser();
        return;
      }
      onCloseBrowser();
    },
    [onCloseBrowser, onOpenBrowser],
  );
  const shouldAcceptInlineSidebarWidth = useCallback(
    ({ nextWidth, wrapper }: { nextWidth: number; wrapper: HTMLElement }) => {
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
    },
    [],
  );

  return (
    <SidebarProvider
      defaultOpen={false}
      open={browserOpen}
      onOpenChange={onOpenChange}
      className="w-auto min-h-0 flex-none bg-transparent"
      style={{ "--sidebar-width": BROWSER_INLINE_DEFAULT_WIDTH } as React.CSSProperties}
    >
      <Sidebar
        side="right"
        collapsible="offcanvas"
        className="border-l border-border bg-card text-foreground"
        resizable={{
          minWidth: BROWSER_INLINE_SIDEBAR_MIN_WIDTH,
          shouldAcceptWidth: shouldAcceptInlineSidebarWidth,
          storageKey: BROWSER_INLINE_SIDEBAR_WIDTH_STORAGE_KEY,
        }}
      >
        {renderBrowserContent ? (
          <LazyBrowserPanel mode="sidebar" onClosePanel={onCloseBrowser} initialUrl={browserUrl} />
        ) : null}
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
};

function ChatThreadRouteView() {
  const threadsHydrated = useStore((store) => store.threadsHydrated);
  const navigate = useNavigate();
  const threadId = Route.useParams({
    select: (params) => ThreadId.makeUnsafe(params.threadId),
  });
  const search = Route.useSearch();
  const threadExists = useStore((store) => store.threads.some((thread) => thread.id === threadId));
  const draftThreadExists = useComposerDraftStore((store) =>
    Object.hasOwn(store.draftThreadsByThreadId, threadId),
  );
  const routeThreadExists = threadExists || draftThreadExists;
  const diffOpen = search.diff === "1";
  const editorOpen = search.editor === "1";
  const browserOpen = search.browser === "1";
  const browserUrl = search.browserUrl;
  const shouldUseSheet = useMediaQuery(INLINE_LAYOUT_MEDIA_QUERY);

  const [hasOpenedDiff, setHasOpenedDiff] = useState(diffOpen);
  const [hasOpenedEditor, setHasOpenedEditor] = useState(editorOpen);
  const [hasOpenedBrowser, setHasOpenedBrowser] = useState(browserOpen);

  // ── Navigation helpers ──────────────────────────────────────────────

  const closeEditor = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId },
      search: { editor: undefined },
    });
  }, [navigate, threadId]);

  const openEditor = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId },
      search: (previous) => {
        const rest = stripEditorSearchParams(previous);
        return { ...rest, editor: "1" };
      },
    });
  }, [navigate, threadId]);

  const closeDiff = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId },
      search: { diff: undefined },
    });
  }, [navigate, threadId]);

  const openDiff = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId },
      search: (previous) => {
        const rest = stripDiffSearchParams(previous);
        return { ...rest, diff: "1" };
      },
    });
  }, [navigate, threadId]);
  const closeBrowser = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId },
      search: (previous) => {
        const rest = stripBrowserSearchParams(previous);
        return { ...rest };
      },
    });
  }, [navigate, threadId]);
  const openBrowser = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId },
      search: (previous) => {
        const rest = stripBrowserSearchParams(previous);
        return { ...rest, browser: "1" };
      },
    });
  }, [navigate, threadId]);

  // ── Side-effects ────────────────────────────────────────────────────

  useEffect(() => {
    if (diffOpen) setHasOpenedDiff(true);
  }, [diffOpen]);

  useEffect(() => {
    if (editorOpen) setHasOpenedEditor(true);
  }, [editorOpen]);

  useEffect(() => {
    if (browserOpen) setHasOpenedBrowser(true);
  }, [browserOpen]);

  useEffect(() => {
    if (!threadsHydrated) return;
    if (!routeThreadExists) {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, routeThreadExists, threadsHydrated, threadId]);

  if (!threadsHydrated || !routeThreadExists) {
    return null;
  }

  const shouldRenderDiffContent = diffOpen || hasOpenedDiff;
  const shouldRenderEditorContent = editorOpen || hasOpenedEditor;
  const shouldRenderBrowserContent = browserOpen || hasOpenedBrowser;

  // ── Desktop: inline sidebars ────────────────────────────────────────

  if (!shouldUseSheet) {
    return (
      <>
        <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
          <ChatView key={threadId} threadId={threadId} />
        </SidebarInset>
        <RightPanelInlineSidebar
          open={editorOpen}
          onClose={closeEditor}
          onOpen={openEditor}
          defaultWidth={PANEL_INLINE_DEFAULT_WIDTH}
          minWidth={PANEL_INLINE_MIN_WIDTH}
          storageKey={EDITOR_INLINE_SIDEBAR_WIDTH_STORAGE_KEY}
        >
          {shouldRenderEditorContent ? <LazyEditorPanel mode="sidebar" /> : null}
        </RightPanelInlineSidebar>
        <RightPanelInlineSidebar
          open={diffOpen}
          onClose={closeDiff}
          onOpen={openDiff}
          defaultWidth={PANEL_INLINE_DEFAULT_WIDTH}
          minWidth={PANEL_INLINE_MIN_WIDTH}
          storageKey={DIFF_INLINE_SIDEBAR_WIDTH_STORAGE_KEY}
        >
          {shouldRenderDiffContent ? <LazyDiffPanel mode="sidebar" /> : null}
        </RightPanelInlineSidebar>
        <BrowserPanelInlineSidebar
          browserOpen={browserOpen}
          onCloseBrowser={closeBrowser}
          onOpenBrowser={openBrowser}
          renderBrowserContent={shouldRenderBrowserContent}
          browserUrl={browserUrl}
        />
      </>
    );
  }

  // ── Mobile: sheet panels ────────────────────────────────────────────

  return (
    <>
      <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
        <ChatView key={threadId} threadId={threadId} />
      </SidebarInset>
      <RightPanelSheet open={editorOpen} onClose={closeEditor} maxWidth="min(92vw,820px)">
        {shouldRenderEditorContent ? <LazyEditorPanel mode="sheet" /> : null}
      </RightPanelSheet>
      <RightPanelSheet open={diffOpen} onClose={closeDiff} maxWidth="min(88vw,820px)">
        {shouldRenderDiffContent ? <LazyDiffPanel mode="sheet" /> : null}
      </RightPanelSheet>
      <BrowserPanelSheet browserOpen={browserOpen} onCloseBrowser={closeBrowser}>
        {shouldRenderBrowserContent ? (
          <LazyBrowserPanel mode="sheet" onClosePanel={closeBrowser} initialUrl={browserUrl} />
        ) : null}
      </BrowserPanelSheet>
    </>
  );
}

export const Route = createFileRoute("/_chat/$threadId")({
  validateSearch: (search) => ({
    ...parseDiffRouteSearch(search),
    ...parseEditorRouteSearch(search),
    ...parseBrowserRouteSearch(search),
  }),
  search: {
    middlewares: [
      retainSearchParams<DiffRouteSearch & EditorRouteSearch & BrowserRouteSearch>([
        ...DIFF_PANEL_SEARCH_PARAMS,
        ...EDITOR_PANEL_SEARCH_PARAMS,
        "browser",
        "browserUrl",
      ]),
    ],
  },
  component: ChatThreadRouteView,
});
