"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { dashboardSectionClass } from "@/components/trip-dashboard/constants";
import { readApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";

type AdminAddUserProps = {
  tripId: string;
  tripCode: string;
  onAdded?: () => void;
};

// TODO(invite-email): wire this up to an email service so the link can be sent
// automatically. For now the admin copy-pastes the link manually.
// TODO(server-auth): the underlying POST /api/participants/add-participant has
// no admin check — UI-only gating today. When server-side admin authorization
// lands, this form should call a dedicated /admin-add route that verifies the
// caller is is_admin === true for the trip.
export function AdminAddUser({
  tripId,
  tripCode,
  onAdded,
}: AdminAddUserProps) {
  const [username, setUsername] = useState("");
  const [isDriver, setIsDriver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invitedUsername, setInvitedUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Username is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/participants/add-participant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: trimmed,
          trip_id: tripId,
          is_driver: isDriver,
        }),
      });

      if (!res.ok) {
        setError(await readApiError(res, "Could not add member"));
        return;
      }

      const url = new URL("/", window.location.origin);
      url.searchParams.set("code", tripCode);
      url.searchParams.set("username", trimmed);

      setInviteUrl(url.toString());
      setInvitedUsername(trimmed);
      setUsername("");
      setIsDriver(false);
      onAdded?.();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in non-HTTPS dev or sandboxed iframes — fall
      // back to a manual select.
    }
  };

  return (
    <div className={cn(dashboardSectionClass, "flex flex-col gap-4")}>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-atlas-teal">
          <UserPlus className="size-5" strokeWidth={2.25} aria-hidden />
          Invite a member
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Add someone by username. You&apos;ll get an invite link to share with
          them, and opening it signs them into this trip automatically.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-atlas-teal">Username</span>
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="e.g. alex"
            className="rounded-2xl border border-atlas-teal/20 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-atlas-teal/25 placeholder:text-slate-400 focus:ring-2"
            disabled={isSubmitting}
            autoComplete="off"
            required
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isDriver}
            onChange={(e) => setIsDriver(e.target.checked)}
            disabled={isSubmitting}
            className="size-4 rounded border-atlas-teal/30 accent-atlas-teal"
          />
          Mark as driver
        </label>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !username.trim()}
          className="rounded-2xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
        >
          {isSubmitting ? "Adding…" : "Add member"}
        </button>
      </form>

      {inviteUrl && invitedUsername && (
        <div className="rounded-2xl border border-green-200 bg-green-50/80 p-4">
          <p className="text-sm font-semibold text-green-700">
            <span className="font-mono">{invitedUsername}</span> added — share
            this link
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Anyone who opens it joins the trip as{" "}
            <span className="font-mono text-atlas-teal">{invitedUsername}</span>{" "}
            automatically. They can set a password later from the Personal tab.
          </p>
          <code className="mt-3 block w-full select-all break-all rounded-lg border border-atlas-teal/10 bg-white/95 px-3 py-2.5 font-mono text-sm leading-relaxed text-atlas-teal">
            {inviteUrl}
          </code>

          <button
            type="button"
            onClick={onCopy}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-atlas-teal/20 bg-white px-3 py-2 text-sm font-semibold text-atlas-teal transition-colors hover:bg-atlas-mist/40"
          >
            {copied ? (
              <>
                <Check className="size-4" strokeWidth={2.25} aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" strokeWidth={2.25} aria-hidden />
                Copy link
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
