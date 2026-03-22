import type * as Monaco from "monaco-editor";

let themesRegistered = false;

export function registerT3CodeEditorThemes(monaco: typeof Monaco): void {
  if (themesRegistered) {
    return;
  }

  monaco.editor.defineTheme("t3code-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0c0c0d",
      "editor.foreground": "#f5f5f5",
      "editorLineNumber.foreground": "#71717a",
      "editorLineNumber.activeForeground": "#a1a1aa",
      "editor.selectionBackground": "#27272a80",
      "editor.lineHighlightBackground": "#18181b40",
      "editorCursor.foreground": "#818cf8",
      "editor.inactiveSelectionBackground": "#27272a40",
      "editorWidget.background": "#0c0c0d",
      "editorWidget.border": "#ffffff0f",
      "editorSuggestWidget.background": "#0c0c0d",
      "editorSuggestWidget.border": "#ffffff0f",
      "editorSuggestWidget.selectedBackground": "#27272a",
      "editorIndentGuide.background": "#ffffff08",
      "editorIndentGuide.activeBackground": "#ffffff14",
      "scrollbarSlider.background": "#ffffff1a",
      "scrollbarSlider.hoverBackground": "#ffffff2e",
    },
  });

  monaco.editor.defineTheme("t3code-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#262626",
      "editorLineNumber.foreground": "#a1a1aa",
      "editorLineNumber.activeForeground": "#71717a",
      "editor.selectionBackground": "#00000008",
      "editor.lineHighlightBackground": "#0000000a",
      "editorCursor.foreground": "#4f46e5",
      "editor.inactiveSelectionBackground": "#00000006",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#00000014",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#00000014",
      "editorSuggestWidget.selectedBackground": "#0000000a",
      "editorIndentGuide.background": "#00000008",
      "editorIndentGuide.activeBackground": "#00000014",
      "scrollbarSlider.background": "#00000026",
      "scrollbarSlider.hoverBackground": "#00000040",
    },
  });

  themesRegistered = true;
}

export function resolveEditorTheme(resolvedTheme: "light" | "dark"): string {
  return resolvedTheme === "dark" ? "t3code-dark" : "t3code-light";
}
