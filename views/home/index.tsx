"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAims } from "@/context/aims-context";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import type { Aim } from "@/service/aims";

export default function HomeView() {
  const {
    aims,
    profile,
    loading: aimsLoading,
    handleGlobalCheckInAction,
  } = useAims();

  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGlobalCheckIn = async () => {
    try {
      await handleGlobalCheckInAction();
    } catch (err) {
      console.error("Failed to record global check-in", err);
    }
  };

  const getMockupFormattedDate = () => {
    const d = new Date();
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${weekday}, ${day} ${month}, ${year}`;
  };

  const getWeekDates = () => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 1 is Monday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));

    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (!mounted) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center p-6 bg-black text-white">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-zinc-500 animate-pulse">Loading Aim Streaker...</p>
      </div>
    );
  }

  if (aimsLoading) {
    return <DashboardSkeleton />;
  }

  const userName = profile?.name || "Streaker";
  const avatarUrl = profile?.avatarUrl || "";
  const globalStreak = profile?.globalStreak || 0;
  const hasCheckedInToday = profile?.lastGlobalCheckInDate === new Date().toLocaleDateString("en-CA");

  const weekDates = getWeekDates();
  const weekdaysLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Find the highest streak among all active aims
  const activeAims = aims.filter((a) => !a.completed);
  const maxStreakVal = activeAims.length > 0 ? Math.max(...activeAims.map((a) => a.streak)) : 0;

  return (
    <div className="flex min-h-full flex-1 flex-col px-4 pt-6 pb-28 relative bg-black text-white">
      
      {/* Hello user header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            Hello, {userName}! <span className="animate-bounce origin-bottom-right inline-block">👋</span>
          </h2>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{getMockupFormattedDate()}</p>
        </div>
        <Link href="/profile" aria-label="Open profile">
          <div className="relative w-11 h-11 rounded-full border border-zinc-850 overflow-hidden bg-zinc-900 flex items-center justify-center hover:scale-105 active:scale-95 transition duration-200 shadow-md">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src="/images/beginner-group/avatar-3.jpeg"
                alt="Profile Default"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </Link>
      </div>

      {/* Repeat days weekly calendar card */}
      <div 
        onClick={handleGlobalCheckIn}
        className={`mb-6 rounded-[2rem] bg-surface border p-5 relative overflow-hidden transition-all duration-300 select-none ${
          hasCheckedInToday
            ? "border-border"
            : "border-accent/45 cursor-pointer hover:border-accent active:scale-[0.99] shadow-[0_0_15px_rgba(163,255,18,0.05)]"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-sm font-bold text-white tracking-tight">Repeat days</span>
            <span className="text-[10px] text-zinc-500 block font-medium mt-0.5">
              {hasCheckedInToday ? `Daily streak: ${globalStreak} days 🔥` : "Tap card to check-in today ⚡"}
            </span>
          </div>
          <button className="text-zinc-500 hover:text-white transition p-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
            </svg>
          </button>
        </div>

        <div className="flex justify-between items-center">
          {weekDates.map((date, idx) => {
            const dayNum = date.getDate();
            const isDateToday = isToday(date);
            return (
              <div key={idx} className="flex flex-col items-center flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDateToday ? "text-accent" : "text-zinc-500"}`}>
                  {weekdaysLabels[idx]}
                </span>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isDateToday
                      ? "bg-accent/20 text-accent ring-1 ring-accent/50 shadow-[0_0_10px_rgba(163,255,18,0.2)]"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-900"
                  }`}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aims streak list */}
      <div className="flex flex-col gap-5">
        {activeAims.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-border bg-surface p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 text-zinc-650 mb-4 border border-zinc-900">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6 text-zinc-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9"
                />
              </svg>
            </div>
            <h4 className="text-base font-extrabold text-white mb-1">Set Your Target</h4>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[260px] mb-6">
              You don't have any active Aims right now. Set a goal, form a habit, and start tracking your streak!
            </p>
            <Link
              href="/aims/new"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-xs font-bold text-black transition hover:bg-accent/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              + Launch Your First Aim
            </Link>
          </div>
        ) : (
          /* List of Aims */
          activeAims.map((aim) => {
            const isLongest = aim.streak === maxStreakVal && maxStreakVal > 0;
            return (
              <Link key={aim.id} href={`/aims/${aim.id}`} className="group block">
                <div className="rounded-[2rem] bg-surface border border-border p-5 transition-all duration-300 group-hover:border-zinc-700/80 group-hover:scale-[1.01] active:scale-[0.99] shadow-md">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                        {isLongest ? "Longest Streak" : "Active Streak"}
                      </span>
                      <h4 className="text-sm font-medium text-zinc-500 mt-1">{aim.title}</h4>
                    </div>
                    <button className="text-zinc-500 hover:text-white transition p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                      </svg>
                    </button>
                  </div>

                  {/* Circular progress container */}
                  <div className="relative w-44 h-44 flex items-center justify-center mx-auto my-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id={`circle-grad-${aim.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#a3ff12" />
                        </linearGradient>
                      </defs>
                      {/* Gray track circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        className="text-zinc-900"
                        strokeWidth="9"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      {/* Colored progress circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke={`url(#circle-grad-${aim.id})`}
                        strokeWidth="9"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - (aim.progress || 0) / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-500 ease-out"
                      />
                    </svg>
                    
                    {/* Inner content overlay */}
                    <div className="absolute w-[80%] h-[80%] bg-white rounded-full flex flex-col items-center justify-center shadow-lg">
                      <span className="text-4xl font-black text-black tracking-tight">{aim.streak}</span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">days</span>
                    </div>
                  </div>

                  {/* Card Footer status info */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-3">
                    <span>Progress: {aim.progress}%</span>
                    <span>Deadline: {aim.deadline}</span>
                  </div>

                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Floating Bottom capsule Navigation */}
      <div className="fixed bottom-6 inset-x-4 max-w-[398px] mx-auto z-45">
        <div className="flex items-center justify-around h-16 bg-zinc-950/90 backdrop-blur-md border border-zinc-900 rounded-full px-2 shadow-[0_10px_35px_rgba(0,0,0,0.7)]">
          
          {/* Icon 1: Profile/Home (Active) */}
          <Link href="/" className="relative flex items-center justify-center w-11 h-11 rounded-full bg-accent/15 text-accent shadow-[0_0_15px_rgba(163,255,18,0.2)]">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </Link>

          {/* Icon 2: Statistics (Graph) */}
          <Link href="/profile/rewards" className="flex items-center justify-center w-11 h-11 text-zinc-500 hover:text-white transition duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </Link>

          {/* Icon 3: Plus button */}
          <Link href="/aims/new" className="flex items-center justify-center w-11 h-11 text-zinc-500 hover:text-white transition duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>

        </div>
      </div>

    </div>
  );
}
