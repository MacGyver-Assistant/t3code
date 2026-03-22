export interface EditorRouteSearch {
  editor?: "1" | undefined;
  editorFilePath?: string | undefined;
}

function isEditorOpenValue(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function normalizeSearchString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function stripEditorSearchParams<T extends Record<string, unknown>>(
  params: T,
): Omit<T, "editor" | "editorFilePath"> {
  const { editor: _editor, editorFilePath: _editorFilePath, ...rest } = params;
  return rest as Omit<T, "editor" | "editorFilePath">;
}

export function parseEditorRouteSearch(search: Record<string, unknown>): EditorRouteSearch {
  const editor = isEditorOpenValue(search.editor) ? "1" : undefined;
  const editorFilePath = editor ? normalizeSearchString(search.editorFilePath) : undefined;

  return {
    ...(editor ? { editor } : {}),
    ...(editorFilePath ? { editorFilePath } : {}),
  };
}
