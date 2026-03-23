import { describe, expect, it } from "vitest";
import {
  parseBrowserRouteSearch,
  stripBrowserSearchParams,
} from "./browserRouteSearch";

describe("parseBrowserRouteSearch", () => {
  it("returns empty when no browser param", () => {
    expect(parseBrowserRouteSearch({})).toEqual({});
  });

  it("parses browser=1", () => {
    expect(parseBrowserRouteSearch({ browser: "1" })).toEqual({ browser: "1" });
  });

  it("parses browser=1 with browserUrl", () => {
    expect(
      parseBrowserRouteSearch({ browser: "1", browserUrl: "http://localhost:3000" }),
    ).toEqual({ browser: "1", browserUrl: "http://localhost:3000" });
  });

  it("ignores browserUrl when browser is not open", () => {
    expect(parseBrowserRouteSearch({ browserUrl: "http://localhost:3000" })).toEqual({});
  });

  it("trims whitespace-only browserUrl", () => {
    expect(parseBrowserRouteSearch({ browser: "1", browserUrl: "   " })).toEqual({
      browser: "1",
    });
  });

  it("accepts numeric 1 for browser", () => {
    expect(parseBrowserRouteSearch({ browser: 1 })).toEqual({ browser: "1" });
  });

  it("accepts boolean true for browser", () => {
    expect(parseBrowserRouteSearch({ browser: true })).toEqual({ browser: "1" });
  });
});

describe("stripBrowserSearchParams", () => {
  it("removes browser and browserUrl keys", () => {
    expect(
      stripBrowserSearchParams({ browser: "1", browserUrl: "http://localhost:3000", diff: "1" }),
    ).toEqual({ diff: "1" });
  });

  it("returns same shape when no browser keys", () => {
    expect(stripBrowserSearchParams({ diff: "1" })).toEqual({ diff: "1" });
  });
});
