"use client";

import React from "react";

interface GpsPermissionModalProps {
  isOpen: boolean;
  error: string | null;
  isAcquiring: boolean;
  onRetry: () => void;
  onClose: () => void;
}

export function GpsPermissionModal({
  isOpen,
  error,
  isAcquiring,
  onRetry,
  onClose,
}: GpsPermissionModalProps) {
  if (!isOpen) return null;

  const isDenied = error?.toLowerCase().includes("denied") ?? false;
  const isUnavailable = error?.toLowerCase().includes("unavailable") ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shrink-0">
            {isDenied ? "🔒" : "🛰️"}
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-white">
              {isDenied ? "Location Access Blocked" : "GPS Required to Run"}
            </h3>
            <p className="text-xs text-zinc-400">
              Territory tracking requires an active GPS fix.
            </p>
          </div>
        </div>

        {/* Dynamic Context Message */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-4 mb-5 text-xs text-zinc-300 space-y-2">
          {error ? (
            <p className="text-amber-300 font-medium">{error}</p>
          ) : (
            <p className="text-zinc-300">
              Aim Streaker maps your running route in real-time to calculate enclosed loops and claim world territories. Without GPS, running cannot be tracked.
            </p>
          )}

          {isDenied && (
            <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-zinc-400">
              <p className="font-semibold text-white">How to enable location:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Tap the lock / settings icon in your browser address bar</li>
                <li>Set <strong>Location</strong> permission to <strong>Allow</strong></li>
                <li>Tap "Retry GPS" below</li>
              </ul>
            </div>
          )}

          {isUnavailable && (
            <div className="pt-2 border-t border-zinc-800 space-y-1.5 text-zinc-400">
              <p className="font-semibold text-white">Device location is turned off:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Swipe down your device quick settings or open Settings</li>
                <li>Turn ON <strong>Location / GPS</strong></li>
                <li>Ensure High Accuracy / Precise Location is enabled</li>
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRetry}
            disabled={isAcquiring}
            className={`w-full h-12 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition select-none ${
              isAcquiring
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-accent text-black hover:bg-accent/90 shadow-[0_4px_20px_rgba(163,255,18,0.25)] active:scale-95"
            }`}
          >
            {isAcquiring ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                <span>Acquiring GPS Signal...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Turn On GPS / Retry</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
