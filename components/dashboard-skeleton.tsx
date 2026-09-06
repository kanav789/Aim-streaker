"use client";

export function DashboardSkeleton() {
  return (
    <div className="flex min-h-full flex-1 flex-col px-4 pt-6 pb-28 bg-black text-white select-none">
      {/* Hello User Header Skeleton */}
      <div className="mb-6 flex justify-between items-center animate-pulse">
        <div>
          <div className="h-7 w-48 bg-zinc-800 rounded-lg mb-2" />
          <div className="h-4 w-32 bg-zinc-900 rounded-md" />
        </div>
        <div className="w-11 h-11 rounded-full bg-zinc-800" />
      </div>

      {/* Repeat Days Weekly Calendar Card Skeleton */}
      <div className="mb-6 rounded-[2rem] bg-zinc-950/60 border border-zinc-900 p-5 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="h-5 w-24 bg-zinc-850 rounded-md mb-2" />
            <div className="h-3.5 w-40 bg-zinc-900 rounded-md" />
          </div>
          <div className="w-5 h-5 bg-zinc-900 rounded-full" />
        </div>

        <div className="flex justify-between items-center">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="h-3 w-8 bg-zinc-900 rounded mb-2" />
              <div className="w-9 h-9 rounded-full bg-zinc-850" />
            </div>
          ))}
        </div>
      </div>

      {/* Aims Streak Cards list Skeletons */}
      <div className="flex flex-col gap-5 animate-pulse">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-[2rem] bg-zinc-950/60 border border-zinc-900 p-5"
          >
            {/* Card Header Skeleton */}
            <div className="flex justify-between items-start">
              <div>
                <div className="h-4 w-28 bg-zinc-850 rounded-md mb-2" />
                <div className="h-5 w-44 bg-zinc-800 rounded-md" />
              </div>
              <div className="w-5 h-5 bg-zinc-900 rounded-full" />
            </div>

            {/* Circular Progress Skeleton */}
            <div className="relative w-44 h-44 flex items-center justify-center mx-auto my-6">
              <div className="w-40 h-40 rounded-full border-[9px] border-zinc-900 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="h-7 w-12 bg-zinc-850 rounded-md mb-2" />
                  <div className="h-3 w-16 bg-zinc-900 rounded-md" />
                </div>
              </div>
            </div>

            {/* Footer Stats Skeleton */}
            <div className="flex justify-around items-center pt-2 border-t border-zinc-900/60">
              <div className="text-center flex flex-col items-center">
                <div className="h-4 w-16 bg-zinc-900 rounded mb-1" />
                <div className="h-3 w-12 bg-zinc-900 rounded" />
              </div>
              <div className="h-8 w-[1px] bg-zinc-900" />
              <div className="text-center flex flex-col items-center">
                <div className="h-4 w-20 bg-zinc-900 rounded mb-1" />
                <div className="h-3 w-12 bg-zinc-900 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
