import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Aim Streaker",
  description: "Terms of Service for Aim Streaker",
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@aimstreaker.app";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-black text-zinc-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition duration-200">
          Back
        </Link>
        <h1 className="text-base font-semibold text-white">Terms of Service</h1>
        <span className="w-10" aria-hidden />
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            Last updated: August 2026
          </p>

          <p>
            Welcome to Aim Streaker! By using Aim Streaker, you agree to these simple terms.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. Use of Aim Streaker</h2>
            <p>
              Aim Streaker helps you create aims, set recurring steps, track your progress, and build streaks.
            </p>
            <p>
              Use the app responsibly and don't use it for anything illegal or harmful.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Your Account</h2>
            <p>
              You're responsible for keeping your account information secure and for the activity that happens through your account.
            </p>
            <p>
              Please provide accurate information when creating your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Your Content</h2>
            <p>
              Your aims, steps, notes, and progress belong to you.
            </p>
            <p>
              We only use this information to provide and improve the Aim Streaker experience.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Your Streaks</h2>
            <p>
              Streaks are based on the activity recorded in the app. While we try to keep everything accurate, technical issues or interruptions may occasionally affect your streak.
            </p>
            <p className="italic text-zinc-400">
              So... don't blame us too much if you miss a day. 😄
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Availability</h2>
            <p>
              We try to keep Aim Streaker running smoothly, but the service may occasionally be unavailable because of maintenance, updates, or technical problems.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">6. Changes</h2>
            <p>
              We may add, remove, or change features as Aim Streaker grows.
            </p>
            <p>
              We may also update these terms when necessary.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">7. Account Deletion</h2>
            <p>
              You can stop using Aim Streaker or request deletion of your account and associated data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">8. Contact</h2>
            <p>
              If you have any questions or problems, contact us at:
            </p>
            <p className="text-accent font-semibold">
              Email: {CONTACT_EMAIL}
            </p>
          </section>

          <p className="pt-4 text-center text-xs text-zinc-500 font-medium">
            Thanks for using Aim Streaker. Now go build that streak. 🔥
          </p>
        </div>
      </main>
    </div>
  );
}
