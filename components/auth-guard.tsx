"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4">
        <p className="text-sm text-secondary">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center px-4">
        <p className="text-sm text-secondary">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}
