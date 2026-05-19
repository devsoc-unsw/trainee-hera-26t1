import type { ComponentType, ReactNode } from "react";

const navButtonBase =
  "flex w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-center text-sm font-semibold transition-colors";

export function DashboardNavTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${navButtonBase} ${
        active
          ? "bg-atlas-teal text-white shadow-md hover:bg-atlas-teal-hover"
          : "border border-atlas-teal/20 bg-white/60 text-atlas-teal shadow-sm hover:bg-white/90"
      }`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      {label}
    </button>
  );
}

export function DashboardSectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-semibold tracking-tight text-atlas-teal">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}

export function DashboardFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-atlas-teal text-white shadow-sm"
          : "border border-atlas-teal/20 bg-white/80 text-atlas-teal hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}
