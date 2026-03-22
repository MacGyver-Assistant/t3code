import { memo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface BrowserNavBarProps {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  onUrlSubmit: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onRefresh: () => void;
  onClosePanel: () => void;
}

export const BrowserNavBar = memo(function BrowserNavBar({
  url,
  canGoBack,
  canGoForward,
  isLoading,
  onUrlSubmit,
  onGoBack,
  onGoForward,
  onRefresh,
  onClosePanel,
}: BrowserNavBarProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [isEditing, setIsEditing] = useState(false);

  const displayUrl = isEditing ? inputUrl : url;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onUrlSubmit(inputUrl);
      setIsEditing(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setInputUrl(url);
      setIsEditing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onGoBack}
        className={cn(
          "size-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground transition-colors",
          canGoBack
            ? "hover:text-foreground hover:bg-accent"
            : "opacity-40 pointer-events-none",
        )}
        aria-label="Go back"
        aria-disabled={!canGoBack}
      >
        <ChevronLeftIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onGoForward}
        className={cn(
          "size-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground transition-colors",
          canGoForward
            ? "hover:text-foreground hover:bg-accent"
            : "opacity-40 pointer-events-none",
        )}
        aria-label="Go forward"
        aria-disabled={!canGoForward}
      >
        <ChevronRightIcon className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onRefresh}
        className="size-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={isLoading ? "Loading..." : "Refresh page"}
      >
        {isLoading ? (
          <LoaderIcon className="size-3.5 animate-spin" />
        ) : (
          <RefreshCwIcon className="size-3.5" />
        )}
      </button>
      <input
        type="url"
        value={displayUrl}
        onChange={(e) => {
          setInputUrl(e.target.value);
          setIsEditing(true);
        }}
        onFocus={(e) => {
          setInputUrl(url);
          setIsEditing(true);
          e.target.select();
        }}
        onBlur={() => {
          setIsEditing(false);
        }}
        onKeyDown={handleKeyDown}
        className="flex-1 h-7 px-2 text-xs font-mono bg-muted/50 rounded-md border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring selection:bg-primary/20"
        placeholder="http://localhost:3000"
        aria-label="URL address bar"
      />
      <button
        type="button"
        onClick={onClosePanel}
        className="size-7 shrink-0 flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        aria-label="Close browser panel"
      >
        <XIcon className="size-3.5" />
      </button>
    </>
  );
});
