import { GlobeIcon } from "lucide-react";
import { isLocalhostUrl } from "../browserPanelStore";

interface BrowserIframeProps {
  url: string;
}

export function BrowserIframe({ url }: BrowserIframeProps) {
  const isLocalhost = isLocalhostUrl(url);

  if (!isLocalhost) {
    return <BrowserFallbackMessage />;
  }

  return (
    <iframe
      src={url}
      className="h-full w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      title="Browser preview"
    />
  );
}

export function BrowserFallbackMessage() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-3 px-6"
      role="alert"
    >
      <div className="rounded-full bg-muted/50 p-3">
        <GlobeIcon className="size-6 text-muted-foreground/40" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-muted-foreground">
          External browsing unavailable
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-[280px]">
          Browser preview is limited to localhost in web mode. Use the desktop app
          for full browsing.
        </p>
      </div>
    </div>
  );
}
