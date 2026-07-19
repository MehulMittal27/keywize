"use client";

import { useState } from "react";

export function QuoteApproval({
  missionId,
  vendorName,
  total,
  initiallyApproved,
}: {
  missionId: string;
  vendorName: string;
  total: number;
  initiallyApproved: boolean;
}) {
  const [approved, setApproved] = useState(initiallyApproved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const approve = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/missions/${missionId}/approve`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Approval could not be stored");
      setApproved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Approval could not be stored");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-black/10 bg-[#fbfaf7] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        User authorization boundary
      </p>
      <h3 className="mt-2 font-serif text-2xl font-semibold">
        {approved ? "Quote approved" : `Approve ${vendorName} at $${total} all-in`}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Have government-issued ID and proof of residence or authorization ready. Approval stores this exact quote only. It does not confirm dispatch, work, or payment.
      </p>
      <button
        type="button"
        onClick={approve}
        disabled={approved || busy}
        className="mt-5 w-full rounded-full bg-black px-5 py-4 font-semibold text-white disabled:bg-emerald-600"
      >
        {approved ? "Approved - dispatch not confirmed" : busy ? "Storing approval..." : "Approve quote"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
