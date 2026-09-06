import Link from "next/link";
import { Button } from "@/components/button";

export const metadata = {
  title: "Page Not Found | Aim Streaker",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12 text-center bg-black text-white select-none">
      {/* Target Logo / Flag graphic */}
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-accent/20 bg-accent/5 text-3xl shadow-[0_0_25px_rgba(163,255,18,0.1)]">
        {/* Summit Flag */}
        🚩
      </div>

      <h1 className="text-4xl font-black text-white tracking-tight">404</h1>
      <h2 className="text-lg font-bold text-zinc-350 mt-2">Page Not Found</h2>
      
      <p className="mt-3 max-w-xs text-sm text-zinc-500 leading-relaxed">
        It looks like you've wandered off the track! This page does not exist or has been moved.
      </p>

      <div className="mt-8 w-full max-w-xs px-4">
        <Link href="/" className="block">
          <Button className="w-full py-3 bg-accent text-background font-bold hover:bg-accent/90">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
