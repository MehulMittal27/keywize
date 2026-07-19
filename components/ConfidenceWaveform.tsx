export function ConfidenceWaveform({ score }: { score: number }) {
  // Generate 12 bars, height is somewhat random but influenced by score
  const numBars = 12;
  const bars = Array.from({ length: numBars }).map((_, i) => {
    // Generate a height from 10% to 100%, based on score but with some variance to look like a waveform
    const baseHeight = Math.max(10, score);
    const variance = (Math.random() - 0.5) * 40;
    const finalHeight = Math.min(100, Math.max(10, baseHeight + variance));
    return finalHeight;
  });

  // Color logic based on score
  const colorClass = 
    score >= 80 ? "bg-green-400" :
    score >= 50 ? "bg-yellow-400" : 
    "bg-pink-400";

  return (
    <div className="flex items-end gap-1 h-8">
      {bars.map((height, i) => (
        <div 
          key={i} 
          className={`w-1.5 rounded-full ${colorClass} opacity-80`}
          style={{ height: `${height}%`, transition: "height 0.3s ease" }}
        />
      ))}
    </div>
  );
}
