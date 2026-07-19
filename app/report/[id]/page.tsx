import { mockQuotes } from "../../../lib/mockData";
import { getMission } from "../../../lib/store";
import { VoiceTrustBadge } from "../../../components/VoiceTrustBadge";
import { NegotiationPlaybook } from "../../../components/NegotiationPlaybook";
import Link from "next/link";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotes = getMission(id)?.quotes ?? mockQuotes;
  const premium = quotes.find((quote) => quote.vendorName === "Premium Secure") ?? mockQuotes[2];
  const neighborhood = quotes.find((quote) => quote.vendorName === "Neighborhood Locksmith") ?? mockQuotes[1];
  const speedy = quotes.find((quote) => quote.vendorName === "Speedy Lock & Key") ?? mockQuotes[0];
  const finalPrice = premium.priceOrTermsChanged ? premium.totalEstimate ?? 145 : 145;
  const savings = Math.max(0, 165 - finalPrice);

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#111111] font-sans pb-24">
      <nav className="flex items-center justify-between px-8 py-6 max-w-5xl mx-auto border-b border-black/5">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/demo" className="text-sm font-medium hover:underline">Demo Panel</Link>
          <span className="px-3 py-1 bg-black text-white text-xs font-bold rounded-full uppercase tracking-wide">Report Ready</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto mt-12 px-6">
        <header className="mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#30a985]/10 text-[#30a985] rounded-full text-xs font-bold tracking-wide uppercase mb-6 border border-[#30a985]/20">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Recommendation Secured
          </div>
          <h1 className="text-4xl lg:text-5xl font-serif leading-tight tracking-tight mb-4">
            We found a safe locksmith under your $150 budget.
          </h1>
          <p className="text-gray-600 text-lg">
            3 local vendors contacted. 1 flagged for hidden-fee risk. We negotiated a $20 discount on the fastest option.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Winner Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-black/5 border-2 border-[#111111] relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-[#30a985] to-teal-200 blur-3xl opacity-20 pointer-events-none" />

               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                 <div>
                   <h2 className="text-2xl font-bold flex items-center gap-3">
                     {premium.vendorName} <span className="text-xl">🏆</span>
                   </h2>
                   <p className="text-gray-500 font-medium mt-1">Best blend of speed and verified pricing.</p>
                 </div>
                 <div className="text-left sm:text-right">
                   <div className="text-4xl font-serif font-bold text-[#30a985]">${finalPrice}</div>
                   <div className="text-sm font-semibold uppercase tracking-wide mt-1">{premium.etaMinutes ?? 15} Min ETA</div>
                 </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                 <div>
                   <div className="text-xs text-gray-500 font-medium">All-in Price</div>
                   <div className="font-semibold text-green-700">Yes</div>
                 </div>
                 <div>
                   <div className="text-xs text-gray-500 font-medium">No-drill first</div>
                   <div className="font-semibold text-blue-700">Confirmed</div>
                 </div>
                 <div>
                   <div className="text-xs text-gray-500 font-medium">ID Req.</div>
                   <div className="font-semibold">Yes</div>
                 </div>
                 <div>
                   <div className="text-xs text-gray-500 font-medium">Warranty</div>
                   <div className="font-semibold">{premium.warranty ?? "1 year"}</div>
                 </div>
               </div>

               {/* Success-Fee Pricing Block */}
               <div className="bg-[#111111] text-white p-5 rounded-2xl mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div>
                   <h3 className="font-bold text-lg text-[#30a985]">We saved you ${savings}.00</h3>
                   <p className="text-sm text-gray-400">Our AI negotiated the price down from $165 to ${finalPrice}.</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Keywize 20% Success Fee</p>
                   <p className="font-bold text-2xl font-serif">${(savings * 0.2).toFixed(2)}</p>
                 </div>
               </div>

               <div className="space-y-4">
                 <h3 className="font-semibold flex items-center gap-2">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                   Transcript Evidence
                 </h3>
                 <div className="bg-[#fbfaf7] p-5 rounded-2xl border border-black/5 space-y-3">
                   <div className="text-sm"><span className="font-bold text-[#111111]">Keywize:</span> What is the total price?</div>
                   <div className="text-sm"><span className="font-bold text-[#30a985]">Premium Secure:</span> {premium.transcriptEvidence[0] ?? "Usually it is $165 for emergency extraction."}</div>
                   <div className="text-sm"><span className="font-bold text-[#111111]">Keywize:</span> Can you do ${finalPrice}? I have another quote for $130 but you are faster.</div>
                   <div className="text-sm flex items-start gap-3">
                     <span className="font-bold text-[#30a985] whitespace-nowrap">Premium Secure:</span>
                     <div>
                       <span className="bg-yellow-100 px-1 rounded">{premium.transcriptEvidence.find((line) => line.includes("$145")) ?? "Um, we can drop it to $145 if you book right now."}</span>
                       <div className="mt-2"><VoiceTrustBadge level="Medium" /></div>
                     </div>
                   </div>
                 </div>
               </div>

               <NegotiationPlaybook tactics={[
                 "Anchored price against real competitor quote ($130)",
                 "Traded immediate booking for $20 discount",
                 "Verified all-in status to prevent dispatch scams"
               ]} />

               <div className="mt-8 flex gap-4">
                 <button className="flex-1 bg-[#111111] text-white py-4 rounded-full font-medium shadow-xl shadow-black/10 hover:bg-gray-800 transition-all active:scale-95 text-lg">
                   Approve & Dispatch
                 </button>
                 <button className="px-6 py-4 rounded-full font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all">
                   Call me instead
                 </button>
               </div>
            </div>
          </div>

          {/* Alternatives Column */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-serif text-xl mb-4">Other Quotes</h3>

            {/* Vendor B - Honest but slow */}
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="font-bold">Neighborhood Locksmith</h4>
                 <span className="font-bold">${neighborhood.totalEstimate ?? 130}</span>
               </div>
               <p className="text-sm text-gray-500 mb-3">{neighborhood.etaMinutes ?? 30} min ETA • No-drill first</p>
               <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded inline-block font-medium">{neighborhood.riskLevel} Risk (Score: {neighborhood.riskScore}/100)</div>
            </div>

            {/* Vendor A - Scam */}
            <div className="bg-white p-5 rounded-2xl border-2 border-pink-100 shadow-sm opacity-60">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="font-bold">Speedy Lock & Key</h4>
                 <span className="font-bold text-gray-400">?</span>
               </div>
               <p className="text-sm text-gray-500 mb-3">20 min ETA • Refused total</p>
               <div className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded inline-block font-medium mb-3">{speedy.riskLevel} Risk (Score: {speedy.riskScore}/100)</div>
               <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                 &ldquo;{speedy.transcriptEvidence[0] ?? "It starts at $39, the tech will tell you the rest."}&rdquo;
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
