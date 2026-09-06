"use client";

export function DetailsSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col pb-8 bg-black text-white select-none animate-pulse">
      {/* Header Skeleton */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-900">
        <div className="h-5 w-10 bg-zinc-850 rounded" />
        <div className="h-5 w-32 bg-zinc-800 rounded" />
        <span className="w-10" />
      </header>

      {/* Main Content Skeleton */}
      <main className="flex flex-1 flex-col px-4 pt-6">
        {/* Aim Hero Title & Description Skeleton */}
        <div className="mb-6">
          <div className="h-8 w-64 bg-zinc-850 rounded-lg mb-2.5" />
          <div className="h-4 w-full bg-zinc-900 rounded mb-1.5" />
          <div className="h-4 w-3/4 bg-zinc-900 rounded mb-4" />

          {/* Deadline indicator badge skeleton */}
          <div className="h-6 w-44 bg-zinc-900 rounded-full" />
        </div>

        {/* Progress Stats Card Skeleton */}
        <div className="mb-6 rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-16 bg-zinc-850 rounded" />
            <div className="h-4 w-28 bg-zinc-900 rounded font-mono" />
          </div>
          {/* Progress Bar Skeleton */}
          <div className="h-2.5 w-full rounded-full bg-zinc-900" />
        </div>

        {/* Streak card Skeleton */}
        <div className="mb-6 grid grid-cols-5 gap-3 items-center rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
          <div className="col-span-3">
            <div className="h-3.5 w-24 bg-zinc-900 rounded mb-2.5" />
            <div className="h-7 w-32 bg-zinc-850 rounded" />
          </div>
          <div className="col-span-2">
            <div className="h-10 w-full bg-zinc-900 rounded-xl" />
          </div>
        </div>

        {/* Action Steps Section Skeleton */}
        <div className="mb-8">
          <div className="h-5 w-36 bg-zinc-850 rounded mb-4" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border border-zinc-900 bg-zinc-950/60 p-4"
              >
                {/* Checkbox Placeholder */}
                <div className="h-5 w-5 rounded-md bg-zinc-900" />

                {/* Step Details Placeholder */}
                <div className="flex-1">
                  <div className="h-4 w-5/6 bg-zinc-900 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="mt-auto space-y-3 pt-6 border-t border-zinc-900/60">
          <div className="h-12 w-full bg-zinc-900 rounded-xl" />
          <div className="h-12 w-full bg-zinc-950/20 border border-zinc-900 rounded-xl" />
        </div>
      </main>
    </div>
  );
}
