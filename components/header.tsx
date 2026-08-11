"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { getUserProfile } from "@/service/user";

export function Header() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!user) return;

    const loadAvatar = async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile.avatarUrl) {
          setAvatarUrl(profile.avatarUrl);
        }
      } catch (err) {
        console.error("Failed to load header profile avatar", err);
      }
    };

    loadAvatar();
  }, [user]);

  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border bg-background">
      <p className="text-lg font-semibold text-primary">Aim Streaker</p>
      <Link href="/profile" aria-label="Open profile">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="h-9 w-9 shrink-0 rounded-full border border-border bg-black" />
        )}
      </Link>
    </header>
  );
}
