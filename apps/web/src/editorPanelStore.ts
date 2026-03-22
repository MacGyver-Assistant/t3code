import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OpenEditorFile {
  path: string;
  contents: string;
  savedContents: string;
  language: string;
  isSaving: boolean;
  error: string | null;
}

interface EditorPanelState {
  openFiles: OpenEditorFile[];
  activeFilePath: string | null;
  openFile: (file: {
    path: string;
    contents: string;
    language: string;
  }) => void;
  closeFile: (path: string) => void;
  setActiveFilePath: (path: string | null) => void;
  setFileContents: (path: string, contents: string) => void;
  markSaving: (path: string, saving: boolean) => void;
  markSaveSuccess: (path: string, contents: string) => void;
  setFileError: (path: string, error: string | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "t3code:editor-panel-state:v1";

function normalizePath(path: string): string {
  return path.trim();
}

function upsertFile(openFiles: OpenEditorFile[], nextFile: OpenEditorFile): OpenEditorFile[] {
  const existingIndex = openFiles.findIndex((file) => file.path === nextFile.path);
  if (existingIndex === -1) {
    return [...openFiles, nextFile];
  }

  return openFiles.map((file, index) => (index === existingIndex ? nextFile : file));
}

export const useEditorPanelStore = create<EditorPanelState>()(
  persist(
    (set) => ({
      openFiles: [],
      activeFilePath: null,
      openFile: (file) => {
        const path = normalizePath(file.path);
        if (path.length === 0) {
          return;
        }

        set((state) => ({
          openFiles: upsertFile(state.openFiles, {
            path,
            contents: file.contents,
            savedContents: file.contents,
            language: file.language,
            isSaving: false,
            error: null,
          }),
          activeFilePath: path,
        }));
      },
      closeFile: (path) => {
        const normalizedPath = normalizePath(path);
        set((state) => {
          const nextOpenFiles = state.openFiles.filter((file) => file.path !== normalizedPath);
          const nextActiveFilePath =
            state.activeFilePath === normalizedPath
              ? (nextOpenFiles.at(-1)?.path ?? null)
              : state.activeFilePath;
          return {
            openFiles: nextOpenFiles,
            activeFilePath: nextActiveFilePath,
          };
        });
      },
      setActiveFilePath: (path) => {
        set({ activeFilePath: path ? normalizePath(path) : null });
      },
      setFileContents: (path, contents) => {
        const normalizedPath = normalizePath(path);
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.path === normalizedPath ? { ...file, contents, error: null } : file,
          ),
        }));
      },
      markSaving: (path, saving) => {
        const normalizedPath = normalizePath(path);
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.path === normalizedPath ? { ...file, isSaving: saving } : file,
          ),
        }));
      },
      markSaveSuccess: (path, contents) => {
        const normalizedPath = normalizePath(path);
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.path === normalizedPath
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
      setFileError: (path, error) => {
        const normalizedPath = normalizePath(path);
        set((state) => ({
          openFiles: state.openFiles.map((file) =>
            file.path === normalizedPath ? { ...file, isSaving: false, error } : file,
          ),
        }));
      },
      clear: () => set({ openFiles: [], activeFilePath: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        openFiles: state.openFiles.map((file) => ({
          path: file.path,
          contents: file.contents,
          savedContents: file.savedContents,
          language: file.language,
          isSaving: false,
          error: null,
        })),
        activeFilePath: state.activeFilePath,
      }),
    },
  ),
);

export type { OpenEditorFile };
