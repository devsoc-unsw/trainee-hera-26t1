import { Crown } from "lucide-react";
import type { TripMapParticipant } from "@/app/api/trips/map-locations/route";

type MemberRowProps = {
  member: TripMapParticipant;
};

export function MemberRow({ member }: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-atlas-teal/10 bg-white/80 px-3 py-2.5">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
          member.is_admin
            ? "bg-amber-100 text-amber-800"
            : member.is_driver
              ? "bg-atlas-mist text-atlas-teal"
              : "bg-slate-100 text-slate-600"
        }`}
        aria-hidden
      >
        {member.is_admin ? (
          <Crown className="size-4" strokeWidth={1.75} />
        ) : (
          member.username.slice(0, 1).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-800">{member.username}</p>
        <p className="text-xs text-slate-500">
          {member.is_admin && "Admin · "}
          {member.is_driver ? "Driver" : "Passenger"}
          {member.location?.address ? " · Pin set" : ""}
        </p>
      </div>
      {member.is_admin && (
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          Admin
        </span>
      )}
    </div>
  );
}
