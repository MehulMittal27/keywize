"use client";

import Link from "next/link";
import { mockQuotes } from "../../lib/mockData";

export default function DemoPanel() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#111111] font-sans p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-serif font-bold mb-6">Keywize Demo Panel</h1>
        <p className="text-gray-600 mb-8">Use this page to reset the demo or jump to specific steps during the pitch.</p>

        <div className="space-y-4 mb-12">
          <h2 className="text-xl font-bold border-b pb-2">Quick Navigation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/" className="p-4 bg-white rounded-xl border hover:border-black transition-colors shadow-sm">
              <span className="block font-bold">1. Landing Page</span>
              <span className="text-sm text-gray-500">The main entrance with SaaS design</span>
            </Link>
            <Link href="/intake" className="p-4 bg-white rounded-xl border hover:border-black transition-colors shadow-sm">
              <span className="block font-bold">2. Intake Form</span>
              <span className="text-sm text-gray-500">User lockout and budget capture</span>
            </Link>
            <Link href="/mission/mission-001" className="p-4 bg-white rounded-xl border hover:border-black transition-colors shadow-sm">
              <span className="block font-bold">3. Live Dashboard</span>
              <span className="text-sm text-gray-500">Shows incoming quotes and negotiation trigger</span>
            </Link>
            <Link href="/report/mission-001" className="p-4 bg-white rounded-xl border hover:border-black transition-colors shadow-sm">
              <span className="block font-bold">4. Final Report</span>
              <span className="text-sm text-gray-500">The ranked recommendation with transcript</span>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold border-b pb-2">Demo Personas (Mock Data)</h2>
          <div className="space-y-3">
            {mockQuotes.map((quote) => (
              <div key={quote.id} className="p-4 bg-white rounded-xl border shadow-sm">
                <div className="flex justify-between font-bold">
                  <span>{quote.vendorName}</span>
                  <span className={quote.riskLevel === "High" ? "text-pink-600" : quote.riskLevel === "Low" ? "text-green-600" : "text-yellow-600"}>
                    {quote.riskLevel} Risk
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <p><strong>Quote Confidence:</strong> {quote.quoteConfidence}</p>
                  <p><strong>Drilling Policy:</strong> {quote.drillingPolicy}</p>
                  <p><strong>Red Flags:</strong> {quote.redFlags.length > 0 ? quote.redFlags.join(", ") : "None"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
