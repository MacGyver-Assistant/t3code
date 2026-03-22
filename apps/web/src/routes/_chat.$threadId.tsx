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
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useStore } from "../store";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

const DiffPanel = lazy(() => import("../components/DiffPanel"));
const EditorPanel = lazy(() => import("../components/EditorPanel"));

const INLINE_LAYOUT_MEDIA_QUERY = "(max-width: 1180px)";
const DIFF_INLINE_SIDEBAR_WIDTH_STORAGE_KEY = "chat_diff_sidebar_width";
const EDITOR_INLINE_SIDEBAR_WIDTH_STORAGE_KEY = "chat_editor_sidebar_width";
const PANEL_INLINE_DEFAULT_WIDTH = "clamp(28rem,48vw,44rem)";
const PANEL_INLINE_MIN_WIDTH = 26 * 16; // 416px

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
  const shouldUseSheet = useMediaQuery(INLINE_LAYOUT_MEDIA_QUERY);

  const [hasOpenedDiff, setHasOpenedDiff] = useState(diffOpen);
  const [hasOpenedEditor, setHasOpenedEditor] = useState(editorOpen);

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

  // ── Side-effects ────────────────────────────────────────────────────

  useEffect(() => {
    if (diffOpen) setHasOpenedDiff(true);
  }, [diffOpen]);

  useEffect(() => {
    if (editorOpen) setHasOpenedEditor(true);
  }, [editorOpen]);

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
    </>
  );
}

export const Route = createFileRoute("/_chat/$threadId")({
  validateSearch: (search) => ({
    ...parseDiffRouteSearch(search),
    ...parseEditorRouteSearch(search),
  }),
  search: {
    middlewares: [
      retainSearchParams<DiffRouteSearch & EditorRouteSearch>([
        ...DIFF_PANEL_SEARCH_PARAMS,
        ...EDITOR_PANEL_SEARCH_PARAMS,
      ]),
    ],
  },
  component: ChatThreadRouteView,
});
