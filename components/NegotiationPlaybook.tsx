export function NegotiationPlaybook({ tactics }: { tactics: string[] }) {
  if (tactics.length === 0) return null;
  
  return (
    <div className="bg-[#111111] text-white p-4 rounded-2xl shadow-lg mt-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        AI Negotiation Tactics Used
      </h4>
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
