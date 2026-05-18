import Link from "next/link";
import { Bell, UserRound } from "lucide-react";

type LandingNavbarProps = {
  brandName?: string;
};

/**
 * Top bar for the marketing landing page only.
 * Map / Trips / Members live on the app shell later — not shown here per design.
 */
export function LandingNavbar({ brandName = "Atlas" }: LandingNavbarProps) {
  return (
    <header className="relative z-20 w-full shrink-0 border-b border-atlas-teal/15 bg-white/20 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[100rem] items-center justify-between px-5 py-4 sm:px-10 sm:py-5 lg:px-14">
        <Link
          href="/"
          className="font-semibold tracking-tight text-atlas-teal transition-opacity hover:opacity-90 text-xl sm:text-2xl"
        >
          {brandName}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
          <button
            type="button"
            className="rounded-full p-2.5 text-atlas-teal/80 transition-colors hover:bg-white/40 hover:text-atlas-teal"
            aria-label="Notifications (coming soon)"
          >
            <Bell className="size-5 sm:size-[1.35rem]" strokeWidth={1.75} />
          </button>
          <Link
            href="/auth/login"
            className="rounded-full p-2.5 text-atlas-teal/80 ring-1 ring-atlas-teal/15 transition-colors hover:bg-white/40 hover:text-atlas-teal"
            aria-label="Sign in"
          >
            <UserRound className="size-5 sm:size-[1.35rem]" strokeWidth={1.75} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
