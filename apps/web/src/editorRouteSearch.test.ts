import { describe, expect, it } from "vitest";

import { parseEditorRouteSearch } from "./editorRouteSearch";

describe("parseEditorRouteSearch", () => {
  it("parses valid editor search values", () => {
    const parsed = parseEditorRouteSearch({
      editor: "1",
      editorFilePath: "src/app.ts",
    });

    expect(parsed).toEqual({
      editor: "1",
      editorFilePath: "src/app.ts",
    });
  });

  it("treats numeric and boolean editor toggles as open", () => {
    expect(
      parseEditorRouteSearch({
        editor: 1,
        editorFilePath: "src/app.ts",
      }),
    ).toEqual({
      editor: "1",
      editorFilePath: "src/app.ts",
    });

    expect(
      parseEditorRouteSearch({
        editor: true,
        editorFilePath: "src/app.ts",
      }),
    ).toEqual({
      editor: "1",
      editorFilePath: "src/app.ts",
    });
  });

  it("drops file values when editor is closed", () => {
    const parsed = parseEditorRouteSearch({
      editor: "0",
      editorFilePath: "src/app.ts",
    });

    expect(parsed).toEqual({});
  });

  it("normalizes whitespace-only values", () => {
    const parsed = parseEditorRouteSearch({
      editor: "1",
      editorFilePath: "  ",
    });

    expect(parsed).toEqual({
      editor: "1",
    });
  });
});
