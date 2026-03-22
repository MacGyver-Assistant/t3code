import Editor, { type Monaco } from "@monaco-editor/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ThreadId } from "@t3tools/contracts";
import { LoaderCircleIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import {
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ensureNativeApi } from "~/nativeApi";
import { parseEditorRouteSearch, stripEditorSearchParams } from "~/editorRouteSearch";
import { useTheme } from "~/hooks/useTheme";
import { projectReadFileQueryOptions } from "~/lib/editorReactQuery";
import { cn } from "~/lib/utils";
import { useStore } from "~/store";
import { registerT3CodeEditorThemes, resolveEditorTheme } from "./EditorPanelTheme";
import {
  EditorPanelLoadingState,
  EditorPanelShell,
  type EditorPanelMode,
} from "./EditorPanelShell";
import { useEditorPanelStore, makeFileKey } from "~/editorPanelStore";

const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: '"SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  lineHeight: 1.5,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: "line",
  scrollbar: {
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
    verticalSliderSize: 6,
  },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  roundedSelection: true,
  cursorBlinking: "smooth",
  smoothScrolling: true,
  contextmenu: false,
  wordWrap: "on",
} as const;

interface EditorPanelProps {
  mode?: EditorPanelMode;
}

export default function EditorPanel({ mode = "inline" }: EditorPanelProps) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const tabStripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const routeThreadId = useParams({
    strict: false,
    select: (params) => (params.threadId ? ThreadId.makeUnsafe(params.threadId) : null),
  });
  const editorSearch = useSearch({
    strict: false,
    select: (search) => parseEditorRouteSearch(search),
  });
  const activeThreadId = routeThreadId;
  const activeThread = useStore((store) =>
    activeThreadId ? store.threads.find((thread) => thread.id === activeThreadId) : undefined,
  );
  const activeProjectId = activeThread?.projectId ?? null;
  const activeProject = useStore((store) =>
    activeProjectId ? store.projects.find((project) => project.id === activeProjectId) : undefined,
  );
  const activeCwd = activeThread?.worktreePath ?? activeProject?.cwd ?? null;
  const openFiles = useEditorPanelStore((store) => store.openFiles);
  const activeFileKey = useEditorPanelStore((store) => store.activeFileKey);
  const openFile = useEditorPanelStore((store) => store.openFile);
  const closeFile = useEditorPanelStore((store) => store.closeFile);
  const setActiveFileKey = useEditorPanelStore((store) => store.setActiveFileKey);
  const setFileContents = useEditorPanelStore((store) => store.setFileContents);
  const markSaving = useEditorPanelStore((store) => store.markSaving);
  const markSaveSuccess = useEditorPanelStore((store) => store.markSaveSuccess);
  const setFileError = useEditorPanelStore((store) => store.setFileError);

  const selectedFilePath = editorSearch.editorFilePath ?? null;
  const activeOpenFile = useMemo(
    () => openFiles.find((file) => file.key === activeFileKey) ?? null,
    [activeFileKey, openFiles],
  );

  const fileQuery = useQuery(
    projectReadFileQueryOptions({
      cwd: activeCwd,
      relativePath: selectedFilePath,
      enabled: selectedFilePath !== null && activeCwd !== null,
    }),
  );

  useEffect(() => {
    if (!selectedFilePath || !activeCwd || !fileQuery.data) {
      return;
    }

    openFile({
      cwd: activeCwd,
      relativePath: fileQuery.data.relativePath,
      contents: fileQuery.data.contents,
      language: fileQuery.data.language,
    });
  }, [fileQuery.data, openFile, selectedFilePath, activeCwd]);

  useEffect(() => {
    if (!selectedFilePath || !activeCwd) {
      return;
    }
    setActiveFileKey(makeFileKey(activeCwd, selectedFilePath));
  }, [selectedFilePath, activeCwd, setActiveFileKey]);

  const syncScrollButtons = useCallback(() => {
    const element = tabStripRef.current;
    if (!element) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(element.scrollLeft > 0);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, []);

  useEffect(() => {
    syncScrollButtons();
  }, [openFiles, syncScrollButtons]);

  const closeEditor = useCallback(() => {
    void navigate({
      to: "/$threadId",
      params: { threadId: routeThreadId ?? ThreadId.makeUnsafe(activeThread?.id ?? "") },
      search: (previous) => ({ ...stripEditorSearchParams(previous), editor: undefined }),
    });
  }, [activeThread?.id, navigate, routeThreadId]);

  const openEditorFile = useCallback(
    (relativePath: string | null) => {
      if (!routeThreadId) return;
      void navigate({
        to: "/$threadId",
        params: { threadId: routeThreadId },
        search: (previous) => {
          const rest = stripEditorSearchParams(previous);
          return relativePath
            ? { ...rest, editor: "1", editorFilePath: relativePath }
            : { ...rest, editor: "1" };
        },
      });
    },
    [navigate, routeThreadId],
  );

  const onSave = useCallback(async () => {
    if (!activeCwd || !activeOpenFile) {
      return;
    }

    const api = ensureNativeApi();
    markSaving(activeOpenFile.key, true);
    try {
      await api.projects.writeFile({
        cwd: activeCwd,
        relativePath: activeOpenFile.relativePath,
        contents: activeOpenFile.contents,
      });
      markSaveSuccess(activeOpenFile.key, activeOpenFile.contents);
    } catch (error) {
      setFileError(
        activeOpenFile.key,
        error instanceof Error ? error.message : "Failed to save file.",
      );
    }
  }, [activeCwd, activeOpenFile, markSaveSuccess, markSaving, setFileError]);

  const onMount = useCallback(
    (editor: Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[0], monaco: Monaco) => {
      registerT3CodeEditorThemes(monaco);
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void onSave();
      });
    },
    [onSave],
  );

  const onEditorWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const strip = tabStripRef.current;
    if (!strip || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }
    strip.scrollBy({ left: event.deltaY, behavior: "auto" });
  }, []);

  const activeFileIsDirty = activeOpenFile
    ? activeOpenFile.contents !== activeOpenFile.savedContents
    : false;

  const header = (
    <>
      <div className="relative min-w-0 flex-1">
        {canScrollLeft ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-card to-transparent" />
        ) : null}
        {canScrollLeft ? (
          <button
            type="button"
            className="absolute left-0 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-md border border-input bg-background/90 text-muted-foreground hover:text-foreground"
            aria-label="Scroll left"
            onClick={() => tabStripRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>
        ) : null}
        <div
          ref={tabStripRef}
          className="editor-tab-strip flex gap-1 overflow-x-auto px-8 py-0.5"
          role="tablist"
          aria-label="Open files"
          onScroll={syncScrollButtons}
          onWheel={onEditorWheel}
        >
          {openFiles.map((file) => {
            const isActive = file.key === activeOpenFile?.key;
            const isDirty = file.contents !== file.savedContents;
            return (
              <div
                key={file.key}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                aria-label={file.relativePath}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground/80 transition-colors cursor-pointer",
                  isActive && "border-border bg-accent text-accent-foreground",
                )}
                onClick={() => openEditorFile(file.relativePath)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEditorFile(file.relativePath);
                  }
                }}
              >
                <span className="truncate max-w-40">{file.relativePath.split("/").at(-1) ?? file.relativePath}</span>
                {isDirty ? <span className="ml-1 text-[8px] text-primary">●</span> : null}
                <button
                  type="button"
                  aria-label={`Close ${file.relativePath}`}
                  className="ml-1 inline-flex size-3.5 items-center justify-center rounded-sm text-muted-foreground/80 hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeFile(file.key);
                    if (activeFileKey === file.key) {
                      const next = openFiles.find((entry) => entry.key !== file.key) ?? null;
                      openEditorFile(next?.relativePath ?? null);
                    }
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
        {canScrollRight ? (
          <button
            type="button"
            className="absolute right-0 top-1/2 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-md border border-input bg-background/90 text-muted-foreground hover:text-foreground"
            aria-label="Scroll right"
            onClick={() => tabStripRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="size-7 shrink-0 rounded-md border border-input bg-background text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        onClick={closeEditor}
        aria-label="Close editor panel"
      >
        <XIcon className="m-auto size-3.5" />
      </button>
    </>
  );

  // Derive content state: loading → error → empty → ready
  let content: ReactNode;
  if (selectedFilePath && fileQuery.isLoading && !activeOpenFile) {
    content = <EditorPanelLoadingState label="Loading editor..." />;
  } else if (fileQuery.error && !activeOpenFile) {
    // Error state BEFORE empty state so it's reachable when a read fails
    content = (
      <div className="flex flex-1 items-center justify-center px-5 text-center text-[11px] text-destructive-foreground/80">
        {fileQuery.error instanceof Error ? fileQuery.error.message : "Failed to load file."}
      </div>
    );
  } else if (!activeOpenFile) {
    content = (
      <div className="flex flex-1 items-center justify-center px-5 text-center text-xs text-muted-foreground/70" role="status">
        Click a file in the sidebar to open it in the editor.
      </div>
    );
  } else {
    content = (
      <div className="editor-panel-viewport min-h-0 flex-1" role="tabpanel">
        {activeOpenFile.error ? (
          <div className="border-b border-border/60 px-3 py-2 text-[11px] text-destructive-foreground/80">
            {activeOpenFile.error}
          </div>
        ) : null}
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 text-[11px] text-muted-foreground/80">
          <span className="truncate">{activeOpenFile.relativePath}</span>
          {activeFileIsDirty ? <span className="text-primary">Unsaved changes</span> : null}
          {activeOpenFile.isSaving ? (
            <span className="ml-auto inline-flex items-center gap-1">
              <LoaderCircleIcon className="size-3 animate-spin" /> Saving...
            </span>
          ) : null}
        </div>
        <Editor
          height="100%"
          path={activeOpenFile.key}
          language={activeOpenFile.language}
          theme={resolveEditorTheme(resolvedTheme)}
          value={activeOpenFile.contents}
          onMount={onMount}
          onChange={(value) => {
            setFileContents(activeOpenFile.key, value ?? "");
          }}
          options={EDITOR_OPTIONS}
        />
      </div>
    );
  }

  return <EditorPanelShell mode={mode} header={header}>{content}</EditorPanelShell>;
}
