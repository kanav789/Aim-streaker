import React from "react";

interface LocationErrorBannerProps {
  error: string;
  onRetry: () => void;
}

export function LocationErrorBanner({ error, onRetry }: LocationErrorBannerProps) {
  return (
    <div className="mx-4 my-3 rounded-2xl border border-red-500/30 bg-red-950/40 p-4 backdrop-blur-md text-white shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 text-sm">
          ⚠️
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-300">Location Access Issue</h4>
          <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{error}</p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onRetry}
              className="rounded-xl bg-red-500/20 border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 active:scale-95 transition"
            >
              Retry GPS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
