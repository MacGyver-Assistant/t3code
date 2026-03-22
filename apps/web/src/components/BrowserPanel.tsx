import { useCallback, useRef } from "react";
import { GlobeIcon } from "lucide-react";
import { isElectron } from "~/env";
import { useBrowserPanelStore, isValidBrowserUrl } from "../browserPanelStore";
import {
  BrowserPanelShell,
  type BrowserPanelMode,
} from "./BrowserPanelShell";
import { BrowserNavBar } from "./BrowserNavBar";
import { BrowserIframe } from "./BrowserIframe";
import { BrowserWebview } from "./BrowserWebview";

interface BrowserPanelProps {
  mode: BrowserPanelMode;
  onClosePanel: () => void;
  initialUrl?: string | undefined;
}

export default function BrowserPanel({
  mode,
  onClosePanel,
  initialUrl,
}: BrowserPanelProps) {
  const store = useBrowserPanelStore();
  const goBackRef = useRef<(() => void) | null>(null);
  const goForwardRef = useRef<(() => void) | null>(null);
  const reloadRef = useRef<(() => void) | null>(null);
  const navigateRef = useRef<((url: string) => void) | null>(null);

  // Use initialUrl on first mount if provided
  const url = initialUrl && store.url === "http://localhost:3000" ? initialUrl : store.url;

  const handleUrlSubmit = useCallback(
    (rawUrl: string) => {
      let normalizedUrl = rawUrl.trim();
      if (!normalizedUrl) return;

      // Auto-prepend http:// if no protocol
      if (!/^https?:\/\//.test(normalizedUrl)) {
        normalizedUrl = `http://${normalizedUrl}`;
      }

      if (!isValidBrowserUrl(normalizedUrl)) return;

      store.setUrl(normalizedUrl);

      if (isElectron && navigateRef.current) {
        navigateRef.current(normalizedUrl);
      }
    },
    [store],
  );

  const handleGoBack = useCallback(() => {
    goBackRef.current?.();
  }, []);

  const handleGoForward = useCallback(() => {
    goForwardRef.current?.();
  }, []);

  const handleRefresh = useCallback(() => {
    reloadRef.current?.();
  }, []);

  const handleNavigate = useCallback(
    (newUrl: string) => {
      store.setUrl(newUrl);
    },
    [store],
  );

  const handleNavState = useCallback(
    (canGoBack: boolean, canGoForward: boolean) => {
      store.setNavState(canGoBack, canGoForward);
    },
    [store],
  );

  const handleLoadStart = useCallback(() => {
    store.setLoading(true);
  }, [store]);

  const handleLoadStop = useCallback(() => {
    store.setLoading(false);
  }, [store]);

  const handleError = useCallback(
    (message: string) => {
      store.setError(message);
    },
    [store],
  );

  const hasUrl = url && url.trim().length > 0;

  return (
    <BrowserPanelShell
      mode={mode}
      header={
        <BrowserNavBar
          url={url}
          canGoBack={store.canGoBack}
          canGoForward={store.canGoForward}
          isLoading={store.isLoading}
          onUrlSubmit={handleUrlSubmit}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onRefresh={handleRefresh}
          onClosePanel={onClosePanel}
        />
      }
    >
      {/* Loading bar */}
      {store.isLoading && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-10"
          role="progressbar"
          aria-label="Page loading"
        >
          <div className="h-full w-1/3 bg-primary rounded-full animate-[browser-loading_1.5s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Error state */}
      {store.error && (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-6"
          role="alert"
        >
          <GlobeIcon className="size-8 text-muted-foreground/40" />
          <p className="text-center text-xs text-destructive-foreground/80">
            {store.error}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!hasUrl && !store.error && (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-6"
          role="status"
        >
          <GlobeIcon className="size-8 text-muted-foreground/40" />
          <p className="text-center text-xs text-muted-foreground/70">
            Enter a URL to preview
          </p>
        </div>
      )}

      {/* Content */}
      {hasUrl && !store.error && (
        <>
          {isElectron ? (
            <BrowserWebview
              url={url}
              onNavigate={handleNavigate}
              onNavState={handleNavState}
              onLoadStart={handleLoadStart}
              onLoadStop={handleLoadStop}
              onError={handleError}
              goBackRef={goBackRef}
              goForwardRef={goForwardRef}
              reloadRef={reloadRef}
              navigateRef={navigateRef}
            />
          ) : (
            <BrowserIframe url={url} />
          )}
        </>
      )}
    </BrowserPanelShell>
  );
}
