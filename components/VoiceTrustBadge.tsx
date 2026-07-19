export function VoiceTrustBadge({
  level,
  score,
  className = "",
}: {
  level: "High" | "Medium" | "Low";
  score?: number;
  className?: string;
}) {
  const styles = {
    High: "bg-green-50 border-green-100 text-green-700",
    Medium: "bg-yellow-50 border-yellow-100 text-yellow-700",
    Low: "bg-pink-50 border-pink-100 text-pink-700",
  };

  const icons = {
    High: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    Medium: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    Low: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  };

  const labels = {
    High: "Confident",
    Medium: "Hesitant",
    Low: "Evasive / High Risk",
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-sm ${styles[level]} ${className}`}>
      {icons[level]}
      {labels[level]}
      {score !== undefined && <span className="opacity-60 ml-0.5">· {score}%</span>}
    </div>
  );
}
