import Link from "next/link";

export function DashboardNavbar({ brandName = "Atlas" }: { brandName?: string }) {
  return (
    <header className="absolute left-0 right-0 top-0 z-20 w-full shrink-0 border-atlas-teal/15 bg-white/25 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[100rem] items-center px-5 py-4 sm:px-8 sm:py-4">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-atlas-teal transition-opacity hover:opacity-90 sm:text-2xl"
        >
          {brandName}
        </Link>
      </div>
    </header>
  );
}
