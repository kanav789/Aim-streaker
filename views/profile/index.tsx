"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useAuth } from "@/context/auth-context";
import { logout } from "@/service/auth";

export default function ProfileView() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
