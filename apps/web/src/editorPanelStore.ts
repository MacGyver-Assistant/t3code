import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OpenEditorFile {
  /** Unique key: `cwd + ":" + relativePath` */
  key: string;
  cwd: string;
  relativePath: string;
  contents: string;
  savedContents: string;
  language: string;
  isSaving: boolean;
  error: string | null;
}

interface EditorPanelState {
  openFiles: OpenEditorFile[];
  activeFileKey: string | null;
  openFile: (file: {
    cwd: string;
    relativePath: string;
    contents: string;
    language: string;
  }) => void;
  closeFile: (key: string) => void;
  setActiveFileKey: (key: string | null) => void;
  setFileContents: (key: string, contents: string) => void;
  markSaving: (key: string, saving: boolean) => void;
  markSaveSuccess: (key: string, contents: string) => void;
  setFileError: (key: string, error: string | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "t3code:editor-panel-state:v2";

/** Build a unique key from cwd + relativePath to avoid cross-worktree collisions. */
function makeFileKey(cwd: string, relativePath: string): string {
  return `${cwd.trim()}:${relativePath.trim()}`;
}

function upsertFile(openFiles: OpenEditorFile[], nextFile: OpenEditorFile): OpenEditorFile[] {
  const existingIndex = openFiles.findIndex((file) => file.key === nextFile.key);
  if (existingIndex === -1) {
    return [...openFiles, nextFile];
  }

  return openFiles.map((file, index) => (index === existingIndex ? nextFile : file));
}

export const useEditorPanelStore = create<EditorPanelState>()(
  persist(
    (set) => ({
      openFiles: [],
      activeFileKey: null,
      openFile: (file) => {
        const cwd = file.cwd.trim();
        const relativePath = file.relativePath.trim();
        if (relativePath.length === 0 || cwd.length === 0) {
          return;
        }

        const key = makeFileKey(cwd, relativePath);

        set((state) => {
          const existingFile = state.openFiles.find((f) => f.key === key);
          // Preserve local content if file is already open and dirty.
          // Only seed contents on fresh open — never overwrite a dirty buffer.
          const isDirty = existingFile
            ? existingFile.contents !== existingFile.savedContents
            : false;
          const contents = isDirty ? existingFile!.contents : file.contents;
          const savedContents = existingFile && isDirty ? existingFile.savedContents : file.contents;

          return {
            openFiles: upsertFile(state.openFiles, {
              key,
              cwd,
              relativePath,
              contents,
              savedContents,
              language: file.language,
              isSaving: false,
              error: null,
            }),
            activeFileKey: key,
          };
        });
      },
      closeFile: (key) => {
        set((state) => {
          const nextOpenFiles = state.openFiles.filter((file) => file.key !== key);
          const nextActiveFileKey =
            state.activeFileKey === key
              ? (nextOpenFiles.at(-1)?.key ?? null)
              : state.activeFileKey;
          return {
            openFiles: nextOpenFiles,
            activeFileKey: nextActiveFileKey,
          };
        });
      },
      setActiveFileKey: (key) => {
        set({ activeFileKey: key ?? null });
      },
      setFileContents: (key, contents) => {
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.key === key ? { ...file, contents, error: null } : file,
          ),
        }));
      },
      markSaving: (key, saving) => {
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.key === key ? { ...file, isSaving: saving } : file,
          ),
        }));
      },
      markSaveSuccess: (key, contents) => {
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.key === key
              ? {
                  ...file,
                  contents,
                  savedContents: contents,
                  isSaving: false,
                  error: null,
                }
              : file,
          ),
        }));
      },
      setFileError: (key, error) => {
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.key === key ? { ...file, isSaving: false, error } : file,
          ),
        }));
      },
      clear: () => set({ openFiles: [], activeFileKey: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        openFiles: state.openFiles.map((file) => ({
          key: file.key,
          cwd: file.cwd,
          relativePath: file.relativePath,
          contents: file.contents,
          savedContents: file.savedContents,
          language: file.language,
          isSaving: false,
          error: null,
        })),
        activeFileKey: state.activeFileKey,
      }),
    },
  ),
);

export { makeFileKey };
export type { OpenEditorFile };
