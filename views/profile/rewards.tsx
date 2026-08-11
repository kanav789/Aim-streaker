"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { getUserProfile, type UserProfile } from "@/service/user";

export default function RewardsView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userProfile = await getUserProfile(user.uid, user.email || "");
        setProfile(userProfile);
      } catch (err) {
        console.error("Failed to load rewards profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Mock Reward Items for background visual look
  const mockRewards = [
    { id: 1, title: "Neon Green Theme", cost: 50, icon: "🎨", desc: "Unlock a custom neon green UI theme." },
    { id: 2, title: "Custom Avatars Pack", cost: 100, icon: "👤", desc: "Access premium profile anime avatars." },
    { id: 3, title: "Sound Effects Pack", cost: 150, icon: "🔊", desc: "Interactive feedback sounds on check-ins." },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col pb-8">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <Link href="/profile" className="text-sm text-secondary hover:text-primary">
          Profile
        </Link>
        <h1 className="text-lg font-semibold text-primary">Rewards</h1>
        <span className="w-10" aria-hidden />
      </header>

      {/* Main Container */}
      <main className="flex flex-1 flex-col px-4 pt-6">
        {/* Coin Balance Display */}
        <div className="mb-6 rounded-2xl border border-border bg-surface p-6 text-center">
          <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Your Balance
          </span>
          {loading ? (
            <div className="mx-auto mt-2 h-10 w-28 bg-border animate-pulse rounded-lg" />
          ) : (
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-4xl">🪙</span>
              <span className="text-3xl font-extrabold text-primary font-mono">
                {profile?.coins ?? 0}
              </span>
            </div>
          )}
          <p className="text-[10px] text-secondary mt-2">
            Earn 1 coin per check-in. Lose 5 coins if your streak breaks.
          </p>
        </div>

        {/* Rewards Section with "Coming Soon" Overlay */}
        <div className="relative flex-1 rounded-2xl border border-border bg-surface p-4 overflow-hidden min-h-[300px]">
          {/* Frosted Glass Overlay */}
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent mb-3 animate-bounce">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-6 w-6 text-accent"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125V9.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-primary">Rewards Store</h3>
            <p className="text-xs text-secondary max-w-[240px] mt-1.5 leading-relaxed">
              Redeem your streak coins for exclusive customization themes, achievements, and features.
            </p>
            <span className="mt-4 rounded-full bg-accent/20 border border-accent/30 px-4 py-1 text-[10px] font-bold text-accent uppercase tracking-wider animate-pulse">
              Coming Soon
            </span>
          </div>

          {/* Background Blurred Items */}
          <div className="flex flex-col gap-3 opacity-25 select-none pointer-events-none">
            {mockRewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="text-2xl">{reward.icon}</div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-primary">{reward.title}</h4>
                  <p className="text-[10px] text-secondary">{reward.desc}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-accent">🪙 {reward.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
