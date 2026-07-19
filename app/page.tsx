import Link from "next/link";

function MissionPreview() {
  return (
    <div className="w-full max-w-sm mx-auto lg:mx-0 relative">
      <div className="bg-white rounded-[18px] border border-black/8 shadow-2xl shadow-black/8 overflow-hidden">

        {/* Header — mirrors mission page nav */}
        <div className="px-5 py-3.5 border-b border-black/5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#30a985] to-teal-300 flex items-center justify-center shadow-inner shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                <circle cx="7.5" cy="15.5" r="2" fill="white" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-xs">Keywize AI</div>
              <div className="text-[10px] text-[#B87333] font-medium flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#B87333] inline-block animate-pulse" />
                Negotiating · Mission #a1b2c
              </div>
            </div>
          </div>
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">Live</span>
        </div>

        {/* Mini progress strip */}
        <div className="px-5 py-2.5 bg-[#f7f5f0]/60 border-b border-black/5 flex items-center gap-2 overflow-x-auto">
          {["Intake", "Finding", "Calling", "Negotiating", "Report"].map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${i <= 3 ? "bg-[#B87333]" : "bg-gray-200"} ${i === 3 ? "animate-pulse scale-125" : ""}`} />
              <span className={`text-[9px] font-semibold ${i < 3 ? "text-gray-400" : i === 3 ? "text-[#111111]" : "text-gray-200"}`}>{s}</span>
              {i < 4 && <div className="w-3 h-px bg-gray-200 shrink-0" />}
            </div>
          ))}
        </div>

        {/* Vendor cards — same structure as mission page */}
        <div className="px-4 py-4 space-y-3 bg-gray-50/30">

          {/* Vendor B — Honest, low risk */}
          <div className="bg-white rounded-[14px] border border-green-100 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-[10px] font-bold text-green-700 shrink-0">DR</div>
                <div>
                  <div className="text-xs font-bold leading-tight">Daniel Reyes</div>
                  <div className="text-[10px] text-gray-400">Neighborhood Locksmith</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-serif font-bold text-[#30a985]">$130</div>
                <div className="text-[10px] text-gray-400">30 min</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="px-2 py-0.5 bg-green-50 border border-green-100 text-green-700 rounded-full text-[9px] font-semibold">✓ Within $110 budget</span>
              <span className="px-2 py-0.5 bg-[#30a985]/10 text-[#1a7a5a] rounded-full text-[9px] font-semibold">No-drill first</span>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1 py-1.5 bg-[#111111] text-white rounded-[8px] text-[9px] font-bold text-center">Accept</div>
              <div className="flex-1 py-1.5 border border-gray-200 text-gray-400 rounded-[8px] text-[9px] font-bold text-center cursor-not-allowed">Negotiate</div>
              <div className="flex-1 py-1.5 border border-pink-100 text-pink-500 rounded-[8px] text-[9px] font-bold text-center">Reject</div>
            </div>
          </div>

          {/* Vendor C — Negotiated */}
          <div className="bg-white rounded-[14px] border-2 border-[#111111] p-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#111111] text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">Negotiated</div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f7f5f0] border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700 shrink-0">AP</div>
                <div>
                  <div className="text-xs font-bold leading-tight">Alex Petrov</div>
                  <div className="text-[10px] text-gray-400">Premium Secure</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-serif font-bold text-[#30a985]">$145</div>
                <div className="text-[10px] text-gray-400 line-through">$165</div>
                <div className="text-[10px] text-gray-400">15 min</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-100 text-yellow-700 rounded-full text-[9px] font-semibold">⚠ Over $110 budget</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[9px] font-semibold">Fastest ETA</span>
            </div>
            {/* VoiceTrust alert */}
            <div className="bg-pink-50 border border-pink-100 rounded-xl px-2.5 py-1.5 mb-2">
              <div className="text-[9px] font-semibold text-pink-700 flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                VoiceTrust hesitation detected
              </div>
              <div className="text-[9px] text-gray-500 italic mt-0.5">&ldquo;Um, we can drop it to $145 if you book right now.&rdquo;</div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex-1 py-1.5 bg-[#111111] text-white rounded-[8px] text-[9px] font-bold text-center">Accept</div>
              <div className="flex-1 py-1.5 border border-gray-200 text-gray-300 rounded-[8px] text-[9px] font-bold text-center cursor-not-allowed">✓ Negotiated</div>
              <div className="flex-1 py-1.5 border border-pink-100 text-pink-500 rounded-[8px] text-[9px] font-bold text-center">Reject</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -right-3 top-14 bg-white/95 border border-black/5 shadow-xl rounded-[18px] px-3 py-2 flex items-center gap-2 z-10">
        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 font-medium">Saved</div>
          <div className="text-[11px] font-bold">$20 negotiated</div>
        </div>
      </div>
      <div className="absolute -left-3 bottom-20 bg-white/95 border border-black/5 shadow-xl rounded-[18px] px-3 py-2 flex items-center gap-2 z-10">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 font-medium">Verified</div>
          <div className="text-[11px] font-bold">No-drill first</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#111111] flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#30a985]/10 blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[440px] h-[440px] rounded-full bg-purple-200/20 blur-[120px] pointer-events-none translate-x-1/3 translate-y-1/3" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#111111] rounded-lg flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              <circle cx="7.5" cy="15.5" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Keywize</span>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col lg:flex-row items-center max-w-5xl mx-auto px-6 pt-8 pb-20 lg:pt-16 gap-12 lg:gap-16 w-full">

        {/* Left: copy */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#111111] leading-[1.07] tracking-tight max-w-md lg:max-w-none">
            Locked out?
            <br />
            <span className="italic text-gray-400">Don&rsquo;t get played.</span>
          </h1>

          <p className="text-sm text-gray-400 font-medium -mt-3">Your AI locksmith concierge</p>

          <p className="text-base text-gray-500 max-w-sm leading-relaxed">
            Keywize calls locksmiths on your behalf, detects hidden fees, negotiates under your budget, and recommends the safest deal with full evidence.
          </p>

          <Link
            href="/intake"
            className="w-full sm:w-auto px-9 py-4 bg-[#111111] text-white rounded-[14px] font-semibold text-base hover:bg-gray-800 active:scale-[0.97] transition-all shadow-2xl shadow-black/15 text-center"
          >
            Find a Locksmith
          </Link>

          <div className="flex items-center gap-8 mt-2">
            <div className="text-center">
              <div className="text-2xl font-serif">68%</div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">Risk reduced</div>
            </div>
            <div className="w-px h-8 bg-black/8" />
            <div className="text-center">
              <div className="text-2xl font-serif">$40</div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">Avg. saved</div>
            </div>
            <div className="w-px h-8 bg-black/8" />
            <div className="text-center">
              <div className="text-2xl font-serif">3</div>
              <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">Quotes checked</div>
            </div>
          </div>
        </div>

        {/* Right: mission preview */}
        <div className="flex-1 w-full flex justify-center lg:justify-end relative">
          <MissionPreview />
        </div>
      </main>

      {/* Pricing / fee model section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-20 w-full">
        <div className="bg-white border border-black/8 rounded-[18px] p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-8">
            <h2 className="text-2xl font-serif tracking-tight">How Keywize charges</h2>
            <span className="sm:ml-auto inline-flex items-center gap-1.5 px-3 py-1 bg-[#B87333]/10 text-[#8a5520] rounded-[8px] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87333]" />
              Transparent pricing
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f7f5f0] border border-black/8 flex items-center justify-center text-base font-serif font-bold text-[#111111]">1</div>
              <div>
                <div className="font-semibold text-sm mb-1">Search &amp; compare — free</div>
                <p className="text-sm text-gray-500 leading-relaxed">Keywize calls up to 3 locksmiths, collects all-in quotes, and detects hidden fees. No charge for this.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#f7f5f0] border border-black/8 flex items-center justify-center text-base font-serif font-bold text-[#111111]">2</div>
              <div>
                <div className="font-semibold text-sm mb-1">AI negotiates your price</div>
                <p className="text-sm text-gray-500 leading-relaxed">Our AI calls vendors back, uses your competing quotes as leverage, and negotiates the lowest possible price.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#111111] flex items-center justify-center text-base font-serif font-bold text-white">$</div>
              <div>
                <div className="font-semibold text-sm mb-1">We earn 20% of your savings</div>
                <p className="text-sm text-gray-500 leading-relaxed">If we save you $40, our fee is $8. If we save nothing, you pay nothing. Capped at $15 per booking.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>No upfront cost</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Success-only fee</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Capped at $15 max</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30a985" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Full transcript included</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
