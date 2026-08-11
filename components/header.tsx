import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 pt-4 pb-3">
      <p className="text-lg font-semibold text-primary">Prototype</p>
      <Link href="/profile" aria-label="Open profile">
        <Image
          src="/images/anime-avatar.png"
          alt="Profile"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
        />
      </Link>
    </header>
  );
}
