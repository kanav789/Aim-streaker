import React from "react";
import { formatDistance, formatDuration, formatArea, formatPace } from "@/service/running";

interface RunSummaryModalProps {
  isOpen: boolean;
  distanceMeters: number;
  durationSeconds: number;
  newAreaMeters: number;
  totalCumulativeAreaMeters: number;
  isValidLoop: boolean;
  summaryMessage: string;
  onClose: () => void;
}

export function RunSummaryModal({
  isOpen,
  distanceMeters,
  durationSeconds,
  newAreaMeters,
  totalCumulativeAreaMeters,
  isValidLoop,
  summaryMessage,
  onClose,
}: RunSummaryModalProps) {
  if (!isOpen) return null;

  const capturedSuccess = isValidLoop && newAreaMeters > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div
          className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none ${
            capturedSuccess ? "bg-accent/20" : "bg-blue-500/15"
          }`}
        />

        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center text-3xl mb-3 shadow-lg ${
              capturedSuccess
                ? "bg-accent/15 border border-accent/30 text-accent shadow-[0_0_20px_rgba(163,255,18,0.25)] animate-bounce"
                : "bg-zinc-900 border border-zinc-800 text-zinc-300"
            }`}
          >
            {capturedSuccess ? "🏴" : "🏃"}
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {capturedSuccess ? "Territory Captured!" : "Run Complete"}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed px-2">
            {summaryMessage}
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Distance */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/60 p-3.5 text-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Distance
            </span>
            <span className="text-lg font-black font-mono text-white">
              {formatDistance(distanceMeters)}
            </span>
          </div>

          {/* Duration */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/60 p-3.5 text-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Duration
            </span>
            <span className="text-lg font-black font-mono text-white">
              {formatDuration(durationSeconds)}
            </span>
          </div>

          {/* New Territory */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/60 p-3.5 text-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              New Territory
            </span>
            <span
              className={`text-lg font-black font-mono ${
                newAreaMeters > 0 ? "text-accent" : "text-zinc-400"
              }`}
            >
              {formatArea(newAreaMeters)}
            </span>
          </div>

          {/* Avg Pace */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/60 p-3.5 text-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
              Avg Pace
            </span>
            <span className="text-lg font-black font-mono text-white">
              {formatPace(distanceMeters, durationSeconds)}
            </span>
          </div>
        </div>

        {/* Cumulative Total Territory Card */}
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4 text-center mb-6">
          <span className="text-[10px] font-extrabold text-accent uppercase tracking-widest block mb-1">
            Total Permanent Realm
          </span>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-2xl">🌍</span>
            <span className="text-2xl font-black font-mono text-white">
              {formatArea(totalCumulativeAreaMeters)}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">
            Unique cumulative area owned by you on the world map
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="w-full h-13 rounded-2xl bg-accent text-black font-extrabold text-sm tracking-wide transition hover:bg-accent/90 active:scale-[0.98] shadow-[0_4px_20px_rgba(163,255,18,0.2)]"
        >
          Return to World Map
        </button>
      </div>
    </div>
  );
}
