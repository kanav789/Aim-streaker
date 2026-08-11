"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useAuth } from "@/context/auth-context";
import { logout } from "@/service/auth";
import { getUserProfile, type UserProfile } from "@/service/user";

export default function ProfileView() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userProfile = await getUserProfile(user.uid, user.email || "");
        setProfile(userProfile);
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace("/login");
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/" className="text-sm text-secondary hover:text-primary">
          Back
        </Link>
        <p className="text-lg font-semibold text-primary">Profile</p>
        <span className="w-10" aria-hidden />
      </header>

      <main className="flex flex-1 flex-col items-center px-4 pt-8">
        <Image
          src="/images/anime-avatar.png"
          alt="Profile"
          width={96}
          height={96}
          className="h-24 w-24 rounded-full border border-border object-cover"
        />

        <p className="mt-4 text-center text-base text-primary">
          {user?.email ?? "No email"}
        </p>

        {/* User Coins Display */}
        {profile ? (
          <div className="mt-2.5 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1 text-sm font-bold text-accent">
              <span>🪙</span>
              <span>{profile.coins} {profile.coins === 1 ? "coin" : "coins"}</span>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 h-6.5 w-20 bg-border animate-pulse rounded-full" />
        )}

        {/* Navigation Links */}
        <div className="mt-8 w-full flex flex-col gap-3">
          <Link
            href="/profile/rewards"
            className="w-full flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-medium text-primary transition hover:border-secondary/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎁</span>
              <span>Rewards Center</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-secondary">
              <span>View rewards</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        </div>

        <div className="mt-auto w-full pb-8 pt-8">
          <Button
            type="button"
            variant="secondary"
            className="w-full py-3"
            disabled={isLoggingOut}
            onClick={handleLogout}
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </Button>
        </div>
      </main>
    </div>
  );
}
