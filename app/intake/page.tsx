"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CASES_PRIMARY = [
  { id: "room_key_lost",            label: "Room key lost",             icon: "🚪" },
  { id: "key_inside_locked_out",    label: "Key inside, locked out",    icon: "🔑" },
  { id: "main_apartment_key_lost",  label: "Main apartment key lost",   icon: "🏠" },
  { id: "key_stolen",               label: "Key stolen",                icon: "⚠️" },
  { id: "broken_key_inside_lock",   label: "Broken key inside lock",    icon: "🔧" },
];

const CASES_EXTRA = [
  { id: "lock_replacement",         label: "Lock replacement needed",   icon: "🔒" },
  { id: "car_lockout",              label: "Car key locked inside",     icon: "🚗" },
  { id: "safe_lockout",             label: "Safe or cabinet locked",    icon: "🗄️" },
  { id: "office_lockout",           label: "Office / commercial lockout", icon: "🏢" },
];

const MOCK_PROFILE = {
  address: "123 Main St, San Francisco, CA 94109",
  phone: "+1 (415) 555-0123",
};

export default function IntakePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(true);
  const [editingAddress, setEditingAddress] = useState(false);
  const [profileAddress, setProfileAddress] = useState(MOCK_PROFILE.address);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMoreCases, setShowMoreCases] = useState(false);

  const [form, setForm] = useState({
    caseType: "broken_key_inside_lock",
    urgency: "locked_out_now" as "locked_out_now" | "today" | "scheduled",
    propertyType: "apartment" as "apartment" | "dorm" | "house",
    doorType: "main_entry" as "room" | "main_entry" | "building_entry" | "storage",
    lockType: "deadbolt" as "deadbolt" | "knob" | "lever" | "smart_lock" | "unknown",
    locationCity: "San Francisco",
    locationZip: "94109",
    idealPrice: 80,
    maxPrice: 110,
    budgetFlexibility: "strict" as "strict" | "flexible_for_speed" | "flexible_for_rekey",
    newKeysNeeded: 1,
    authorizationConfirmed: false,
    scheduledDate: "",
    scheduledTime: "",
  });

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.authorizationConfirmed) return;
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseType: form.caseType,
          urgency: form.urgency,
          propertyType: form.propertyType,
          doorType: form.doorType,
          lockType: form.lockType,
          locationCity: form.locationCity,
          locationZip: form.locationZip,
          idealPrice: form.idealPrice,
          maxPrice: form.maxPrice,
          budgetFlexibility: form.budgetFlexibility,
          newKeysNeeded: form.newKeysNeeded,
          authorizationConfirmed: form.authorizationConfirmed,
          doorOpen: false,
          keyStolen: form.caseType === "key_stolen",
          brokenKeyVisible: form.caseType === "broken_key_inside_lock",
          needRekey: form.caseType === "key_stolen",
          approvalRequiredAboveBudget: true,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      router.push(`/mission/${data.id}`);
    } catch {
      router.push("/mission/mission-001");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#111111] font-sans pb-24">
      <nav className="flex items-center justify-between px-8 py-5 max-w-2xl mx-auto border-b border-black/5">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              <circle cx="7.5" cy="15.5" r="2" fill="white" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </div>
        <div className="text-sm font-medium text-gray-400">Step 2 of 4 — Intake</div>
      </nav>

      <main className="max-w-2xl mx-auto mt-10 px-6 space-y-6">
        <div>
          <h1 className="text-4xl font-serif tracking-tight mb-1">Tell us what happened</h1>
          <p className="text-gray-500 text-lg">We'll use this to find and negotiate the best possible deal.</p>
        </div>

        {/* Pre-filled Profile Card */}
        <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f7f5f0] border border-black/8 flex items-center justify-center text-lg font-serif font-bold text-[#111111]">
                W
              </div>
              <div>
                <div className="font-semibold text-sm">Mr. Wazowski</div>
                <div className="text-xs text-gray-400">{MOCK_PROFILE.phone}</div>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border ${addressConfirmed ? "bg-green-50 text-green-700 border-green-100" : "bg-yellow-50 text-yellow-700 border-yellow-100"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${addressConfirmed ? "bg-green-500" : "bg-yellow-500"}`} />
              {addressConfirmed ? "Verified" : "Unconfirmed"}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Service address</div>
                {editingAddress ? (
                  <input
                    type="text"
                    value={profileAddress}
                    onChange={e => setProfileAddress(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-[10px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B87333]/30"
                    autoFocus
                  />
                ) : (
                  <div className="text-sm font-medium">{profileAddress}</div>
                )}
              </div>
              {editingAddress ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(false);
                    setAddressConfirmed(true);
                    const parts = profileAddress.split(", ");
                    if (parts.length >= 2) {
                      set("locationCity", parts[1] || form.locationCity);
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-[#B87333] text-white rounded-[10px] text-xs font-semibold hover:bg-[#9a6025] transition-colors shrink-0"
                >
                  Confirm
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(true);
                    setAddressConfirmed(false);
                  }}
                  className="mt-4 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-[10px] text-xs font-semibold hover:bg-gray-50 transition-colors shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {!editingAddress && !addressConfirmed && (
            <p className="mt-3 text-xs text-yellow-600 font-medium">
              Please confirm or edit your address before continuing.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-6 space-y-3">
            <label className="font-semibold block text-sm">What is your situation?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CASES_PRIMARY.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-4 border rounded-[14px] cursor-pointer transition-all ${
                    form.caseType === item.id
                      ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input type="radio" name="caseType" value={item.id} checked={form.caseType === item.id} onChange={e => set("caseType", e.target.value)} className="sr-only" />
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              ))}

              {showMoreCases && CASES_EXTRA.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-4 border rounded-[14px] cursor-pointer transition-all ${
                    form.caseType === item.id
                      ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input type="radio" name="caseType" value={item.id} checked={form.caseType === item.id} onChange={e => set("caseType", e.target.value)} className="sr-only" />
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreCases(v => !v)}
              className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-[#111111] transition-colors"
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform ${showMoreCases ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {showMoreCases ? "Show less" : "Show more"}
            </button>
          </div>

          {/* Urgency */}
          <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-6 space-y-3">
            <label className="font-semibold block text-sm">How urgent is this?</label>
            <div className="flex gap-3">
              {[
                { id: "locked_out_now", label: "Right now" },
                { id: "today", label: "Today" },
                { id: "scheduled", label: "Scheduled" },
              ].map(u => (
                <label
                  key={u.id}
                  className={`flex-1 text-center py-3 text-sm font-medium rounded-[10px] border cursor-pointer transition-all ${
                    form.urgency === u.id
                      ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input type="radio" name="urgency" value={u.id} checked={form.urgency === u.id} onChange={e => set("urgency", e.target.value)} className="sr-only" />
                  {u.label}
                </label>
              ))}
            </div>

            {form.urgency === "scheduled" && (
              <div className="pt-3 border-t border-black/5 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => set("scheduledDate", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[10px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={e => set("scheduledTime", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-[10px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Advanced collapsible */}
          <div className="bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-sm">Advanced settings</span>
                {!showAdvanced && (
                  <span className="ml-3 text-xs text-gray-400">
                    Budget cap: ${form.maxPrice} · {form.doorType.replace("_", " ")} door
                  </span>
                )}
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-6 border-t border-black/5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="space-y-2">
                    <label className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Property</label>
                    <select value={form.propertyType} onChange={e => set("propertyType", e.target.value)} className="w-full px-3 py-3 rounded-[10px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none text-sm">
                      <option value="apartment">Apartment</option>
                      <option value="dorm">Dorm</option>
                      <option value="house">House</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Door</label>
                    <select value={form.doorType} onChange={e => set("doorType", e.target.value)} className="w-full px-3 py-3 rounded-[10px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none text-sm">
                      <option value="main_entry">Main entry</option>
                      <option value="room">Room door</option>
                      <option value="building_entry">Building entry</option>
                      <option value="storage">Storage</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Lock</label>
                    <select value={form.lockType} onChange={e => set("lockType", e.target.value)} className="w-full px-3 py-3 rounded-[10px] border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none text-sm">
                      <option value="deadbolt">Deadbolt</option>
                      <option value="knob">Knob</option>
                      <option value="lever">Lever</option>
                      <option value="smart_lock">Smart lock</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm">Ideal price</label>
                      <span className="text-gray-500 text-sm font-medium">${form.idealPrice}</span>
                    </div>
                    <input type="range" min="30" max="300" step="5" value={form.idealPrice} onChange={e => set("idealPrice", parseInt(e.target.value))} className="w-full accent-[#B87333]" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-sm">Absolute max budget</label>
                      <span className="text-pink-600 text-sm font-bold">${form.maxPrice}</span>
                    </div>
                    <p className="text-xs text-gray-400">Vendors refusing to cap under this amount will be disqualified.</p>
                    <input type="range" min="50" max="500" step="10" value={form.maxPrice} onChange={e => set("maxPrice", parseInt(e.target.value))} className="w-full accent-[#111111]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-sm">Budget flexibility</label>
                  <div className="flex gap-3">
                    {[
                      { id: "strict", label: "Strict" },
                      { id: "flexible_for_speed", label: "Speed ok" },
                      { id: "flexible_for_rekey", label: "Rekey ok" },
                    ].map(b => (
                      <label key={b.id} className={`flex-1 text-center py-2.5 text-xs font-medium rounded-[10px] border cursor-pointer transition-all ${form.budgetFlexibility === b.id ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="radio" name="budgetFlexibility" value={b.id} checked={form.budgetFlexibility === b.id} onChange={e => set("budgetFlexibility", e.target.value)} className="sr-only" />
                        {b.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-sm">New keys needed</label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map(n => (
                      <button key={n} type="button" onClick={() => set("newKeysNeeded", n)} className={`w-12 h-12 rounded-[10px] font-medium text-sm border transition-all ${form.newKeysNeeded === n ? "bg-[#111111] text-white border-[#111111]" : "border-gray-200 hover:border-gray-300"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Authorization */}
          <div className="bg-white rounded-[18px] border border-black/5 shadow-sm p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.authorizationConfirmed}
                onChange={e => set("authorizationConfirmed", e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
              />
              <div className="text-sm">
                <span className="font-semibold text-red-600 block mb-0.5">Required for service</span>
                <span className="text-gray-500">I confirm I am authorized to enter this property and will have government-issued ID and proof of residence ready on arrival.</span>
              </div>
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!form.authorizationConfirmed || isSubmitting || (editingAddress && !addressConfirmed)}
            className={`w-full py-4 rounded-[14px] font-semibold text-white transition-all shadow-md flex items-center justify-center gap-2 text-base ${
              !form.authorizationConfirmed
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-[#111111] hover:bg-gray-800 active:scale-[0.98] shadow-black/10"
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding specialists...
              </>
            ) : (
              "Find Specialists →"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
