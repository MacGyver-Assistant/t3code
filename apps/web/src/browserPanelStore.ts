import { create } from "zustand";

export interface BrowserPanelState {
  url: string;
  inputUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;

  setUrl: (url: string) => void;
  setInputUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  setNavState: (canGoBack: boolean, canGoForward: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const DEFAULT_URL = "http://localhost:3000";

export const useBrowserPanelStore = create<BrowserPanelState>((set) => ({
  url: DEFAULT_URL,
  inputUrl: DEFAULT_URL,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  error: null,

  setUrl: (url) => set({ url, inputUrl: url, error: null }),
  setInputUrl: (inputUrl) => set({ inputUrl }),
  setLoading: (isLoading) => set({ isLoading }),
  setNavState: (canGoBack, canGoForward) => set({ canGoBack, canGoForward }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      url: DEFAULT_URL,
      inputUrl: DEFAULT_URL,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      error: null,
    }),
}));

export function isValidBrowserUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "[::1]"
    );
  } catch {
    return false;
  }
}
