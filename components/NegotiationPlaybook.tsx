const TACTICS = [
  {
    id: "eta_compliment",
    label: "Best ETA compliment",
    desc: "Acknowledged the fastest vendor to create urgency for others to compete.",
  },
  {
    id: "one_blocker",
    label: "One-blocker framing",
    desc: "Identified one objection, price, as the only thing preventing a booking.",
  },
  {
    id: "quote_anchor",
    label: "Real competing quote anchor",
    desc: "Used a confirmed competing quote as leverage and did not invent a number.",
  },
  {
    id: "book_now",
    label: "Book-now trade",
    desc: "Offered to confirm immediately in exchange for a price or terms concession.",
  },
  {
    id: "confirm_lock",
    label: "Confirmation lock",
    desc: "Asked for explicit verbal confirmation of the all-in price before closing.",
  },
];

export function NegotiationPlaybook({
  usedTactics,
  tactics,
}: {
  usedTactics?: string[];
  tactics?: string[];
}) {
  if (tactics) {
    if (tactics.length === 0) return null;

    return (
      <div className="bg-[#111111] text-white p-4 rounded-2xl shadow-lg mt-4">
        <h4 className="text-sm font-semibold mb-3">AI Negotiation Tactics Used</h4>
        <ul className="space-y-2">
          {tactics.map((tactic, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-[#30a985] mt-0.5">✓</span>
              {tactic}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const selectedTactics = usedTactics ?? [];

  return (
    <div className="rounded-2xl border border-[#e8e4dc] bg-[#fdfcfb] p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[#111]">Negotiation Playbook</h3>
      <ul className="space-y-2">
        {TACTICS.map((tactic) => {
          const used = selectedTactics.includes(tactic.id) || selectedTactics.length === 0;
          return (
            <li key={tactic.id} className="flex gap-3 items-start">
              <span
                className={`mt-0.5 h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  used ? "bg-[#30a985] text-white" : "bg-[#e8e4dc] text-[#999]"
                }`}
              >
                {used ? "✓" : "-"}
              </span>
              <div>
                <p className="text-xs font-medium text-[#111]">{tactic.label}</p>
                <p className="text-xs text-[#666]">{tactic.desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default NegotiationPlaybook;
