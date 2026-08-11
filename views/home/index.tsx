"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { useAuth } from "@/context/auth-context";
import { getUserAims, type Aim } from "@/service/aims";
import {
  getUserProfile,
  updateGlobalStreakAndCoins,
  deductCoinsForBrokenStreak,
} from "@/service/user";

export default function HomeView() {
  const { user } = useAuth();

  const [aims, setAims] = useState<Aim[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStreak, setGlobalStreak] = useState<number>(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Streaker");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch active aims and load global habit streak from Firestore
  useEffect(() => {
    if (!mounted || !user) return;

    const fetchDashboardData = async () => {
      try {
        const userAims = await getUserAims(user.uid);
        setAims(userAims);

        // Fetch User Profile from Firestore
        const userProfile = await getUserProfile(user.uid, "User");
        setUserName(userProfile.name || "Streaker");

        const todayStr = new Date().toLocaleDateString("en-CA");
        const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

        let streakCount = userProfile.globalStreak || 0;
        let checkedIn = false;

        if (userProfile.lastGlobalCheckInDate === todayStr) {
          checkedIn = true;
        } else if (userProfile.lastGlobalCheckInDate === yesterdayStr) {
          checkedIn = false;
        } else if (userProfile.lastGlobalCheckInDate) {
          // Streak broken: Deduct 5 coins and reset globalStreak to 0
          if (streakCount > 0) {
            streakCount = 0;
            await deductCoinsForBrokenStreak(user.uid, -5);
          }
        }

        setGlobalStreak(streakCount);
        setHasCheckedInToday(checkedIn);
      } catch (err) {
        console.error("Failed to load dashboard data from Firestore", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, mounted]);

  const handleGlobalCheckIn = async () => {
    if (hasCheckedInToday || !user) return;

    try {
      const userProfile = await getUserProfile(user.uid, "User");
      
      const todayStr = new Date().toLocaleDateString("en-CA");
      const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

      let newStreak = userProfile.globalStreak || 0;

      if (
        userProfile.lastGlobalCheckInDate === yesterdayStr ||
        (newStreak === 0 && !userProfile.lastGlobalCheckInDate)
      ) {
        newStreak += 1;
      } else if (userProfile.lastGlobalCheckInDate !== todayStr) {
        newStreak = 1;
      }

      // Update Firestore: save new global streak and add +1 coin!
      await updateGlobalStreakAndCoins(user.uid, newStreak, todayStr, 1);

      setGlobalStreak(newStreak);
      setHasCheckedInToday(true);
    } catch (err) {
      console.error("Failed to record global check-in in Firestore", err);
    }
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDaysLeftLabel = (deadlineStr: string, completed: boolean) => {
    if (completed) return { text: "Completed 🎉", class: "text-green-500" };

    const target = new Date(deadlineStr + "T00:00:00");
    const today = new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00");
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue ⚠️`, class: "text-accent" };
    } else if (diffDays === 0) {
      return { text: "Due today! ⚡", class: "text-yellow-400 font-semibold" };
    } else {
      return { text: `${diffDays}d left`, class: "text-secondary" };
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <Header />
        <main className="flex flex-1 flex-col px-4 pt-4 items-center justify-center">
          <p className="text-sm text-secondary animate-pulse">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col pb-12">
      <Header />

      <main className="flex flex-1 flex-col px-4 pt-4">
        {/* Welcome Section */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-primary">Hey, {userName} 👋</h2>
            <p className="text-sm text-secondary">Let's work towards your aims today.</p>
          </div>
        </div>

        {/* Global Dashboard Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Daily Streak Habit Tracker */}
          <div
            onClick={handleGlobalCheckIn}
            className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 ${
              hasCheckedInToday
                ? "border-border bg-surface/50 cursor-default"
                : "border-accent/40 bg-surface hover:border-accent cursor-pointer active:scale-[0.98]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Daily Streak
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  hasCheckedInToday ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className={`h-4.5 w-4.5 ${globalStreak > 0 ? "animate-pulse" : ""}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M12.969 18.943c-2.072 0-3.75-1.678-3.75-3.75 0-1.802 1.272-3.308 2.993-3.666a.75.75 0 0 1 .843.916c-.22.846-.178 1.704.092 2.457 1.002-.68 1.782-1.684 2.228-2.87a.75.75 0 0 1 1.272-.112c1.082 1.488 1.583 3.324 1.258 5.17a6.75 6.75 0 0 1-4.887 5.093c-.015.004-.03.007-.044.01-.19.043-.388.067-.591.067ZM11.238 2.228a.75.75 0 0 1 .941.87c-.883 4.412 1.442 8.35 4.394 10.354a.75.75 0 0 1 .194 1.129 9 9 0 1 1-13.882-9.4c.03-.008.06-.016.09-.024.167-.044.341-.068.52-.068a3.745 3.745 0 0 1 3.428 2.234 7.498 7.498 0 0 1 4.315-5.129ZM8.25 15.193a2.25 2.25 0 1 1 4.5 0c0 1.242-.99 2.25-2.25 2.25s-2.25-1.008-2.25-2.25Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-extrabold tracking-tight text-primary font-mono">
                {globalStreak}
              </span>
              <span className="text-[10px] text-secondary block mt-0.5 font-medium">
                {hasCheckedInToday ? "Checked in today!" : "Click to check in"}
              </span>
            </div>
          </div>

          {/* Today Date */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:border-secondary/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                Today
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-4.5 w-4.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="block text-base font-bold text-primary truncate leading-tight">
                {getFormattedDate()}
              </span>
              <span className="text-[10px] text-secondary mt-0.5 block font-medium">
                Calendar day
              </span>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">
            {aims.some((aim) => !aim.completed) ? "Your Active Aim" : "Your Active Aims"}
          </h3>
          {!aims.some((aim) => !aim.completed) ? (
            <Link
              href="/aims/new"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              + Create Aim
            </Link>
          ) : null}
        </div>

        {/* Loading / Aims list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="h-28 rounded-2xl border border-border bg-surface/50 animate-pulse" />
            <div className="h-28 rounded-2xl border border-border bg-surface/50 animate-pulse" />
          </div>
        ) : aims.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center mt-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-border text-secondary mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6 text-secondary/70"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6A2.25 2.25 0 0 1 6 3.75h1.5m9 0h-9"
                />
              </svg>
            </div>
            <h4 className="text-base font-bold text-primary mb-1">Set Your Target</h4>
            <p className="text-xs text-secondary leading-relaxed max-w-[280px] mb-6">
              You haven't launched any Aims yet. Build your execution plan, stay consistent, and
              track your progress.
            </p>
            <Link
              href="/aims/new"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-xs font-bold text-background transition hover:bg-accent/90 hover:scale-[1.02] active:scale-[0.98]"
            >
              + Launch Your First Aim
            </Link>
          </div>
        ) : (
          /* Aims List Cards */
          <div className="flex flex-col gap-4">
            {aims.map((aim) => {
              const deadlineDetails = getDaysLeftLabel(aim.deadline, aim.completed);
              const completedSteps = aim.steps.filter((s) => s.completed).length;
              const totalSteps = aim.steps.length;

              return (
                <Link key={aim.id} href={`/aims/${aim.id}`}>
                  <div className="group block rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:border-secondary/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-base font-bold text-primary group-hover:text-accent transition">
                          {aim.title}
                        </h4>
                        <span className="text-[10px] text-secondary font-mono mt-0.5 block">
                          {completedSteps} of {totalSteps} steps completed
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${deadlineDetails.class}`}>
                        {deadlineDetails.text}
                      </span>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${aim.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-primary font-mono shrink-0">
                        {aim.progress}%
                      </span>
                    </div>

                    {/* Streak flame indicator inside the card */}
                    {!aim.completed && aim.streak > 0 ? (
                      <div className="mt-3 flex items-center gap-1 text-[10px] text-secondary">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5 text-accent animate-pulse"
                        >
                          <path
                            fillRule="evenodd"
                            d="M13.5 4.938a7 7 0 1 1-9.006 1.737c.2-.026.382.116.463.306.135.315.133.657-.005.979A3.5 3.5 0 1 0 11.25 9.75c0-1.077-.35-2.074-.944-2.883a.5.5 0 0 1 .1-.676c.404-.326.792-.72 1.15-1.171.127.135.247.278.358.428.188.257.348.536.478.835.086.2.285.326.505.297.009-.001.018-.003.028-.004a6.762 6.762 0 0 0 .635-1.84Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{aim.streak}d streak</span>
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
