import { describe, expect, it } from "vitest";
import { isValidBrowserUrl, isLocalhostUrl } from "./browserPanelStore";

describe("isValidBrowserUrl", () => {
  it("accepts http URLs", () => {
    expect(isValidBrowserUrl("http://localhost:3000")).toBe(true);
  });

  it("accepts https URLs", () => {
    expect(isValidBrowserUrl("https://example.com")).toBe(true);
  });

  it("rejects file URLs", () => {
    expect(isValidBrowserUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects javascript URLs", () => {
    expect(isValidBrowserUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data URLs", () => {
    expect(isValidBrowserUrl("data:text/html,<h1>hi</h1>")).toBe(false);
  });

  it("rejects invalid strings", () => {
    expect(isValidBrowserUrl("not-a-url")).toBe(false);
  });
});

describe("isLocalhostUrl", () => {
  it("detects localhost", () => {
    expect(isLocalhostUrl("http://localhost:3000")).toBe(true);
  });

  it("detects 127.0.0.1", () => {
    expect(isLocalhostUrl("http://127.0.0.1:5173")).toBe(true);
  });

  it("detects [::1]", () => {
    expect(isLocalhostUrl("http://[::1]:8080")).toBe(true);
  });

  it("rejects external hosts", () => {
    expect(isLocalhostUrl("https://example.com")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isLocalhostUrl("not-a-url")).toBe(false);
  });
});
