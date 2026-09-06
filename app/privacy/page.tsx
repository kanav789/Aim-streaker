import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Aim Streaker",
  description: "Privacy Policy for Aim Streaker",
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@aimstreaker.app";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-black text-zinc-300">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white transition duration-200">
          Back
        </Link>
        <h1 className="text-base font-semibold text-white">Privacy Policy</h1>
        <span className="w-10" aria-hidden />
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="prose prose-invert max-w-none text-sm leading-relaxed space-y-6">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
            Last updated: August 2026
          </p>

          <p>
            Your privacy matters to us. This policy explains, in simple terms, what information Aim Streaker may collect and how we use it.
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">1. What We Collect</h2>
            <p>
              When you use Aim Streaker, we may collect information such as:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Your name or username</li>
              <li>Email address</li>
              <li>Login information</li>
              <li>Your aims and recurring steps</li>
              <li>Your progress and streak history</li>
              <li>Basic device and usage information</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">2. Why We Collect It</h2>
            <p>
              We use this information to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li>Provide Aim Streaker's features</li>
              <li>Save your aims and progress</li>
              <li>Maintain your streaks</li>
              <li>Improve the app</li>
              <li>Keep the service secure</li>
              <li>Send important account-related notifications</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">3. Your Aims Are Yours</h2>
            <p>
              The aims and steps you create belong to you.
            </p>
            <p>
              We don't make your personal aims publicly visible unless you choose to share something through a feature that allows sharing.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">4. Third-Party Services</h2>
            <p>
              Aim Streaker may use trusted third-party services for things like hosting, authentication, analytics, notifications, and other technical services.
            </p>
            <p>
              These services may process limited information as needed to provide their functionality.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">5. Cookies and Local Storage</h2>
            <p>
              We may use cookies or local storage to keep you signed in, remember preferences, and make the app work properly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">6. Keeping Your Data Safe</h2>
            <p>
              We take reasonable steps to protect your information, but no online service can guarantee perfect security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">7. Deleting Your Data</h2>
            <p>
              You can request deletion of your account and associated personal data.
            </p>
            <p className="text-accent font-semibold">
              Email: {CONTACT_EMAIL}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy as Aim Streaker grows. If we make important changes, we'll let you know through the app or website.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-white">9. Contact</h2>
            <p>
              Questions about privacy?
            </p>
            <p className="text-accent font-semibold">
              Email: {CONTACT_EMAIL}
            </p>
          </section>

          <p className="pt-4 text-center text-xs text-zinc-505 font-medium flex items-center justify-center gap-1">
            <span>Your aims are yours, your data matters, and we'll do our best to keep both safe.</span>
            <span>🔒</span>
          </p>
        </div>
      </main>
    </div>
  );
}
