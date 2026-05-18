"use client";

import { useState, type FormEvent } from "react";

type AddParticipantResponse =
  | { participant: unknown }
  | { error: string };

const JoinTripForm = () => {
  const [username, setUsername] = useState("");
  const [tripCode, setTripCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AddParticipantResponse | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/participants/add-participant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, trip_code: tripCode }),
      });

      const json = (await res.json()) as AddParticipantResponse;
      setResult(json);
    } catch {
      setResult({ error: "Network error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-md">
      <h2 className="text-xl font-semibold">Join Trip</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Username</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          type="text"
          placeholder="e.g. alex"
          className="border rounded px-3 py-2"
          disabled={isSubmitting}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Invite code</span>
        <input
          value={tripCode}
          onChange={(e) => setTripCode(e.target.value)}
          type="text"
          placeholder="Trip invite code"
          className="border rounded px-3 py-2"
          disabled={isSubmitting}
          required
        />
      </label>

      <button
        type="submit"
        className="border rounded px-3 py-2 w-fit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Joining..." : "Join Trip"}
      </button>

      {result && (
        <pre className="text-xs border rounded p-3 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </form>
  );
};

export default JoinTripForm;
