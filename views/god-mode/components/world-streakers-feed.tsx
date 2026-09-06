"use client";

import React, { useState } from "react";
import { Territory, formatArea, formatDistance } from "@/service/running";

interface WorldStreakersFeedProps {
  isOpen: boolean;
  territories: Territory[];
  currentUserId: string;
  onClose: () => void;
  onSelectTerritory: (territory: Territory) => void;
}

function timeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "Recently";
  }
}

export function WorldStreakersFeed({
  isOpen,
  territories,
  currentUserId,
  onClose,
  onSelectTerritory,
}: WorldStreakersFeedProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filtered = territories.filter((t) => {
    if (!searchQuery.trim()) return true;
    const name = t.userName || "Streaker";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalWorldArea = territories.reduce((acc, t) => acc + (t.areaSquareMeters || 0), 0);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop tap to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-in Panel */}
      <div className="relative w-full max-w-md h-full bg-zinc-950/95 border-l border-zinc-800/80 p-5 flex flex-col shadow-2xl backdrop-blur-2xl text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center text-lg">
              🌍
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                World Streakers Feed
              </h2>
              <p className="text-[11px] text-zinc-400">
                {territories.length} territories captured worldwide ({formatArea(totalWorldArea)})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm transition"
            aria-label="Close feed"
          >
            ✕
          </button>
        </div>

        {/* Search Box */}
        <div className="py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search runner by name..."
              className="w-full h-10 pl-8 pr-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-accent transition"
            />
          </div>
        </div>

        {/* List of Territories */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <span className="text-3xl block mb-2">🏃</span>
              <p className="text-xs">No territories found.</p>
              <p className="text-[10px] text-zinc-600 mt-1">
                Complete a run to claim the first territory!
              </p>
            </div>
          ) : (
            filtered.map((t, idx) => {
              const isSelf = t.userId === currentUserId;
              const runnerName = t.userName || "Streaker";
              const areaStr = formatArea(t.areaSquareMeters || 0);

              return (
                <div
                  key={t.id || idx}
                  className={`group relative rounded-2xl border p-3.5 transition flex flex-col gap-2 ${
                    isSelf
                      ? "bg-accent/5 border-accent/30 hover:border-accent/60"
                      : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                          isSelf
                            ? "bg-accent/20 text-accent font-bold"
                            : "bg-sky-500/20 text-sky-400 font-bold"
                        }`}
                      >
                        {isSelf ? "👑" : "👤"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4
                            className={`text-xs font-black truncate ${
                              isSelf ? "text-accent" : "text-white"
                            }`}
                          >
                            {isSelf ? `You (${runnerName})` : runnerName}
                          </h4>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          {timeAgo(t.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Area Badge */}
                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono text-xs font-extrabold block ${
                          isSelf ? "text-accent" : "text-sky-400"
                        }`}
                      >
                        {areaStr}
                      </span>
                      {t.distanceMeters ? (
                        <span className="text-[10px] font-mono text-zinc-400 block">
                          {formatDistance(t.distanceMeters)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Fly to Map Action */}
                  <button
                    onClick={() => {
                      onSelectTerritory(t);
                      onClose();
                    }}
                    className={`w-full py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition select-none ${
                      isSelf
                        ? "bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25"
                        : "bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <span>🎯</span>
                    <span>View on Tactical Map</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-zinc-850 text-center">
          <p className="text-[10px] text-zinc-500">
            All runs are saved permanently & visible to every runner worldwide.
          </p>
        </div>
      </div>
    </div>
  );
}
