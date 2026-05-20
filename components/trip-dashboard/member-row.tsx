import { Crown } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";
import { memberHasMapPin } from "@/components/trip-dashboard/member-utils";
import { contrastingTextColor } from "@/lib/driving-group-colors";

type MemberRowProps = {
  member: TripMapParticipant;
  isFocused?: boolean;
  onFocus?: () => void;
};

export function MemberRow({ member, isFocused, onFocus }: MemberRowProps) {
  const hasPin = memberHasMapPin(member);
  const canFocus = hasPin && !!onFocus;
  const groupColor = member.group_color;
  const avatarStyle = groupColor
    ? {
        backgroundColor: groupColor,
        color: contrastingTextColor(groupColor),
      }
    : undefined;

  const content = (
    <>
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
          groupColor
            ? ""
            : member.is_admin
              ? "bg-amber-100 text-amber-800"
              : member.is_driver
                ? "bg-atlas-mist text-atlas-teal"
                : "bg-slate-100 text-slate-600"
        }`}
        style={avatarStyle}
        aria-hidden
      >
        {member.is_admin ? (
          <Crown className="size-4" strokeWidth={1.75} />
        ) : (
          member.username.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium text-slate-800">{member.username}</p>
        <p className="text-xs text-slate-500">
          {member.is_admin && "Admin · "}
          {member.is_driver
            ? `Driver${typeof member.seats === "number" ? ` · ${member.seats} seat${member.seats === 1 ? "" : "s"}` : ""}`
            : "Passenger"}
          {hasPin ? " · Pin set" : " · No pin yet"}
        </p>
      </div>
      {member.is_admin && (
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          Admin
        </span>
      )}
    </>
  );

  const rowClass = `flex w-full items-center gap-3 rounded-2xl border bg-white/80 px-3 py-2.5 ${
    isFocused
      ? "border-atlas-teal ring-2 ring-atlas-teal/25"
      : groupColor
        ? "border-slate-200"
        : "border-atlas-teal/10"
  }`;

  if (canFocus) {
    return (
      <button
        type="button"
        onClick={onFocus}
        className={`${rowClass} cursor-pointer transition-shadow hover:bg-white hover:shadow-sm`}
        aria-label={`Show ${member.username} on map`}
        aria-pressed={isFocused}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={rowClass}
      title={hasPin ? undefined : "This member has not set a map pin yet"}
    >
      {content}
    </div>
  );
}
