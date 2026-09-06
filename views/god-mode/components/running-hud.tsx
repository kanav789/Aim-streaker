import React from "react";
import Link from "next/link";
import { formatDistance, formatDuration, formatArea, formatPace } from "@/service/running";

interface RunningHudProps {
  isRunning: boolean;
  distanceMeters: number;
  durationSeconds: number;
  totalCumulativeAreaMeters: number;
  gpsAccuracy: number | null;
  isGpsReady: boolean;
  isAcquiringGps: boolean;
  locationError: string | null;
  isSignalLost: boolean;
  isNearStartPoint: boolean;
  hasEnoughPoints: boolean;
  onStartRun: () => void;
  onFinishRun: () => void;
  onRequestGps: () => void;
  onOpenGpsHelp: () => void;
  onTriggerDevSimulation?: () => void;
}

export function RunningHud({
  isRunning,
  distanceMeters,
  durationSeconds,
  totalCumulativeAreaMeters,
  gpsAccuracy,
  isGpsReady,
  isAcquiringGps,
  locationError,
  isSignalLost,
  isNearStartPoint,
  hasEnoughPoints,
  onStartRun,
  onFinishRun,
  onRequestGps,
  onOpenGpsHelp,
  onTriggerDevSimulation,
}: RunningHudProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      {/* Top Floating Bar */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Back button */}
        <Link
          href="/"
          className="pointer-events-auto flex items-center justify-center w-11 h-11 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-white shadow-lg hover:border-zinc-700 active:scale-95 transition"
          aria-label="Back to Home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>

        {/* Center: Title & GPS Status */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-3.5 py-2 shadow-lg">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isSignalLost || locationError
                ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                : isAcquiringGps
                ? "bg-sky-400 animate-ping"
                : gpsAccuracy !== null && gpsAccuracy <= 30
                ? "bg-accent shadow-[0_0_8px_rgba(163,255,18,0.8)] animate-pulse"
                : gpsAccuracy !== null
                ? "bg-amber-400"
                : "bg-red-500"
            }`}
          />
          <span className="text-xs font-bold tracking-tight text-white">
            {locationError
              ? "GPS Unavailable"
              : isSignalLost
              ? "Signal Lost"
              : isAcquiringGps
              ? "Acquiring GPS..."
              : gpsAccuracy !== null
              ? `GPS ±${Math.round(gpsAccuracy)}m`
              : "Acquiring GPS..."}
          </span>
        </div>

        {/* Right: Permanent Territory Pill */}
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-3 py-2 text-xs font-bold text-white shadow-lg">
          <span className="text-accent text-sm">🏴</span>
          <span className="font-mono">{formatArea(totalCumulativeAreaMeters)}</span>
        </div>
      </div>

      {/* Bottom Floating Control Panel */}
      <div className="absolute bottom-6 inset-x-4 z-20 pointer-events-none">
        <div className="pointer-events-auto rounded-3xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-850 p-5 shadow-2xl">
          {!isRunning ? (
            /* Idle Pre-Run State */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    Ready to Run ⚡
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Close an enclosed loop to capture new territory.
                  </p>
                </div>
              </div>

              {/* Start Button or GPS Warning Button */}
              {isAcquiringGps ? (
                <button
                  disabled
                  className="w-full h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 cursor-not-allowed select-none"
                >
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>Acquiring GPS Signal...</span>
                </button>
              ) : !isGpsReady || locationError ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onRequestGps}
                    className="w-full h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(245,158,11,0.15)] hover:bg-amber-500/30 active:scale-[0.98] transition select-none"
                  >
                    <span>⚠️</span>
                    <span>Turn On GPS to Start</span>
                  </button>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                    <span className="text-amber-400/90 font-medium">GPS is required to track run & capture territory</span>
                    <button
                      onClick={onOpenGpsHelp}
                      className="text-zinc-300 hover:text-white underline font-semibold transition"
                    >
                      Need Help?
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onStartRun}
                  className="w-full h-14 rounded-2xl bg-accent text-black font-extrabold text-base tracking-wide flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(163,255,18,0.3)] hover:bg-accent/90 active:scale-[0.98] transition select-none"
                >
                  <span>🏃</span>
                  <span>Start Running</span>
                </button>
              )}

              {/* Dev Simulation Option (desktop/local testing) */}
              {isDev && onTriggerDevSimulation && (
                <button
                  onClick={onTriggerDevSimulation}
                  className="w-full py-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 text-[11px] font-semibold text-zinc-400 hover:text-white hover:border-zinc-700 active:scale-98 transition flex items-center justify-center gap-1.5"
                >
                  <span>🧪</span>
                  <span>Simulate Walk Loop (Dev Test)</span>
                </button>
              )}
            </div>
          ) : (
            /* Active Running State */
            <div className="flex flex-col gap-4">
              {/* Mid-run GPS Signal Lost Warning */}
              {isSignalLost && (
                <div className="py-2 px-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-center text-xs font-bold text-red-200 animate-pulse flex items-center justify-center gap-2 shadow-lg">
                  <span>⚠️</span>
                  <span>GPS signal lost — Searching for satellites... Keep moving, your route is safe.</span>
                </div>
              )}

              {/* Loop Status Pill */}
              <div
                className={`py-1.5 px-3 rounded-full text-center text-xs font-bold border transition duration-300 ${
                  isNearStartPoint && hasEnoughPoints
                    ? "bg-accent/20 border-accent text-accent animate-pulse shadow-[0_0_15px_rgba(163,255,18,0.2)]"
                    : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
                }`}
              >
                {isNearStartPoint && hasEnoughPoints
                  ? "🎯 Near start point! Ready to close loop & capture!"
                  : "🏃 Route in progress — return near start to enclose area"}
              </div>

              {/* Live Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-2.5 text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Duration
                  </span>
                  <span className="text-base font-black font-mono text-white mt-0.5 block">
                    {formatDuration(durationSeconds)}
                  </span>
                </div>

                <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-2.5 text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Distance
                  </span>
                  <span className="text-base font-black font-mono text-accent mt-0.5 block">
                    {formatDistance(distanceMeters)}
                  </span>
                </div>

                <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-2.5 text-center">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Pace
                  </span>
                  <span className="text-base font-black font-mono text-white mt-0.5 block">
                    {formatPace(distanceMeters, durationSeconds)}
                  </span>
                </div>
              </div>

              {/* Finish Run Button */}
              <button
                onClick={onFinishRun}
                className="w-full h-13 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-extrabold text-sm tracking-wider shadow-[0_4px_20px_rgba(239,68,68,0.3)] transition flex items-center justify-center gap-2 select-none"
              >
                <span>🏁</span>
                <span>Finish Run & Claim Territory</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
