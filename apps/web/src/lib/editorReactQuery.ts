import type { ProjectReadFileResult } from "@t3tools/contracts";
import { queryOptions } from "@tanstack/react-query";
import { ensureNativeApi } from "~/nativeApi";

export const editorQueryKeys = {
  all: ["editor"] as const,
  file: (cwd: string | null, relativePath: string | null) =>
    ["editor", "file", cwd, relativePath] as const,
};

const EMPTY_FILE_RESULT: ProjectReadFileResult = {
  contents: "",
  language: "plaintext",
  relativePath: "",
};

export function projectReadFileQueryOptions(input: {
  cwd: string | null;
  relativePath: string | null;
  enabled?: boolean;
  staleTime?: number;
}) {
  return queryOptions({
    queryKey: editorQueryKeys.file(input.cwd, input.relativePath),
    queryFn: async () => {
      const api = ensureNativeApi();
      if (!input.cwd || !input.relativePath) {
        throw new Error("Editor file access is unavailable.");
      }
      return api.projects.readFile({
        cwd: input.cwd,
        relativePath: input.relativePath,
      });
    },
    enabled: (input.enabled ?? true) && input.cwd !== null && input.relativePath !== null,
    staleTime: input.staleTime ?? 0,
    placeholderData: (previous) => previous ?? EMPTY_FILE_RESULT,
  });
}
