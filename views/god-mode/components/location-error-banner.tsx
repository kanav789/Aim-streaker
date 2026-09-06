import React from "react";

interface LocationErrorBannerProps {
  error: string;
  isAcquiring?: boolean;
  onRetry: () => void;
  onHelp?: () => void;
}

export function LocationErrorBanner({
  error,
  isAcquiring,
  onRetry,
  onHelp,
}: LocationErrorBannerProps) {
  return (
    <div className="mx-4 my-3 rounded-2xl border border-amber-500/30 bg-zinc-950/90 p-4 backdrop-blur-xl text-white shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 text-base">
          ⚠️
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black tracking-wide uppercase text-amber-400">
              GPS Disabled / Unavailable
            </h4>
          </div>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{error}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onRetry}
              disabled={isAcquiring}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 select-none ${
                isAcquiring
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-accent text-black hover:bg-accent/90 shadow-[0_2px_10px_rgba(163,255,18,0.2)] active:scale-95"
              }`}
            >
              {isAcquiring ? (
                <>
                  <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Enable / Retry GPS</span>
                </>
              )}
            </button>

            {onHelp && (
              <button
                onClick={onHelp}
                className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 active:scale-95 transition"
              >
                Help & Guide
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
