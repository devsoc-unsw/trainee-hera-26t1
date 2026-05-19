"use client";

import { useState, type FormEvent } from "react";

type Status = { type: "success" | "error"; message: string } | null;

/**
 * Dashboard sidebar panel — lets an authenticated user set or change their
 * password. If they are a new user setting a password for the first time
 * (e.g. signed up via a different method), they can leave "Current password"
 * blank.
 */
export function UpdatePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "New passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setStatus({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/user/update-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setStatus({ type: "error", message: data.error ?? "Update failed." });
      } else {
        setStatus({ type: "success", message: data.message ?? "Password updated." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-800">Update Password</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Leave &quot;Current password&quot; blank if you are setting a password for
          the first time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="current-password"
            className="text-xs font-medium text-slate-600"
          >
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password (optional)"
            autoComplete="current-password"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-atlas-teal/30 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="new-password"
            className="text-xs font-medium text-slate-600"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-atlas-teal/30 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="confirm-password"
            className="text-xs font-medium text-slate-600"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-atlas-teal/30 placeholder:text-slate-400 focus:ring-2"
          />
        </div>

        {status && (
          <p
            className={`text-xs font-medium ${
              status.type === "success" ? "text-green-600" : "text-red-500"
            }`}
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 rounded-xl bg-atlas-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-atlas-teal-hover disabled:opacity-60"
        >
          {isLoading ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
