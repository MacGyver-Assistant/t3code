import { useCallback, useEffect, useRef } from "react";
import { isValidBrowserUrl } from "../browserPanelStore";

interface BrowserWebviewProps {
  url: string;
  onNavigate: (url: string) => void;
  onNavState: (canGoBack: boolean, canGoForward: boolean) => void;
  onLoadStart: () => void;
  onLoadStop: () => void;
  onError: (message: string) => void;
  goBackRef: React.MutableRefObject<(() => void) | null>;
  goForwardRef: React.MutableRefObject<(() => void) | null>;
  reloadRef: React.MutableRefObject<(() => void) | null>;
  navigateRef: React.MutableRefObject<((url: string) => void) | null>;
}

export function BrowserWebview({
  url,
  onNavigate,
  onNavState,
  onLoadStart,
  onLoadStop,
  onError,
  goBackRef,
  goForwardRef,
  reloadRef,
  navigateRef,
}: BrowserWebviewProps) {
  const webviewRef = useRef<HTMLWebViewElement>(null);

  const updateNavState = useCallback(() => {
    const wv = webviewRef.current as any;
    if (!wv) return;
    try {
      onNavState(wv.canGoBack(), wv.canGoForward());
    } catch {
      // webview may not be ready yet
    }
  }, [onNavState]);

  useEffect(() => {
    const wv = webviewRef.current as any;
    if (!wv) return;

    const handleNavigate = (event: any) => {
      onNavigate(event.url);
      updateNavState();
    };

    const handleStartLoading = () => {
      onLoadStart();
    };

    const handleStopLoading = () => {
      onLoadStop();
      updateNavState();
    };

    const handleFailLoad = (event: any) => {
      if (event.errorCode === -3) return; // Aborted navigation, ignore
      onError(event.errorDescription || "Failed to load page");
    };

    const handleNewWindow = (event: any) => {
      event.preventDefault();
      // Open external links in system browser if available
      if (typeof window !== "undefined" && (window as any).nativeApi?.shell?.openExternal) {
        (window as any).nativeApi.shell.openExternal(event.url);
      }
    };

    wv.addEventListener("did-navigate", handleNavigate);
    wv.addEventListener("did-navigate-in-page", handleNavigate);
    wv.addEventListener("did-start-loading", handleStartLoading);
    wv.addEventListener("did-stop-loading", handleStopLoading);
    wv.addEventListener("did-fail-load", handleFailLoad);
    wv.addEventListener("new-window", handleNewWindow);

    return () => {
      wv.removeEventListener("did-navigate", handleNavigate);
      wv.removeEventListener("did-navigate-in-page", handleNavigate);
      wv.removeEventListener("did-start-loading", handleStartLoading);
      wv.removeEventListener("did-stop-loading", handleStopLoading);
      wv.removeEventListener("did-fail-load", handleFailLoad);
      wv.removeEventListener("new-window", handleNewWindow);
    };
  }, [onNavigate, onNavState, onLoadStart, onLoadStop, onError, updateNavState]);

  // Expose imperative controls via refs
  useEffect(() => {
    const wv = webviewRef.current as any;
    goBackRef.current = () => {
      if (wv?.canGoBack()) wv.goBack();
    };
    goForwardRef.current = () => {
      if (wv?.canGoForward()) wv.goForward();
    };
    reloadRef.current = () => {
      wv?.reload();
    };
    navigateRef.current = (newUrl: string) => {
      if (isValidBrowserUrl(newUrl)) {
        wv?.loadURL(newUrl);
      }
    };

    return () => {
      goBackRef.current = null;
      goForwardRef.current = null;
      reloadRef.current = null;
      navigateRef.current = null;
    };
  }, [goBackRef, goForwardRef, reloadRef, navigateRef]);

  return (
    <webview
      ref={webviewRef as any}
      src={url}
      partition="persist:browser-panel"
      className="h-full w-full"
      title="Browser preview"
    />
  );
}
