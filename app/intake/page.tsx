"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ElevenLabsIntakeVoice } from "@/components/ElevenLabsIntakeVoice";

const CASES = [
  { id: "room_key_lost", label: "Lost room key" },
  { id: "key_inside_locked_out", label: "Locked inside" },
  { id: "main_apartment_key_lost", label: "Lost main key" },
  { id: "key_stolen", label: "Stolen keys" },
  { id: "broken_key_inside_lock", label: "Broken key inside lock" },
];

function IntakePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isVoiceMode = searchParams.get("mode") === "voice";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [missionMode, setMissionMode] = useState<"reliable_demo" | "live_sandbox">(
    "reliable_demo"
  );

  const [form, setForm] = useState({
    caseType: "broken_key_inside_lock",
    urgency: "locked_out_now" as "locked_out_now" | "today" | "scheduled",
    propertyType: "apartment" as "apartment" | "dorm" | "house",
    doorType: "main_entry" as "room" | "main_entry" | "building_entry" | "storage",
    lockType: "deadbolt" as "deadbolt" | "knob" | "lever" | "smart_lock" | "unknown",
    locationCity: "San Francisco",
    locationZip: "94109",
    idealPrice: 120,
    maxPrice: 150,
    budgetFlexibility: "strict" as "strict" | "flexible_for_speed" | "flexible_for_rekey",
    newKeysNeeded: 1,
    authorizationConfirmed: false,
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
          mode: missionMode,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      router.push(`/mission/${data.id}`);
    } catch {
      setError("We could not create this mission. Your form is preserved so you can retry.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#111111] font-sans pb-24">
      <nav className={`flex items-center justify-between px-6 sm:px-8 py-5 mx-auto border-b border-black/5 ${isVoiceMode ? "max-w-4xl" : "max-w-2xl"}`}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <div className="w-6 h-6 bg-[#111111] rounded flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>
          </div>
          <span className="font-bold tracking-tight">Keywize</span>
        </div>
        <div className="text-sm font-medium text-gray-600">Step {step} of 4 - Intake</div>
      </nav>

      <main className={`mx-auto mt-10 px-6 ${isVoiceMode ? "max-w-4xl" : "max-w-2xl"}`}>
        {isVoiceMode ? (
          <>
            <h1 className="text-4xl font-serif tracking-tight mb-1">Start with your voice</h1>
            <p className="text-gray-500 mb-8 text-lg">
              Talk with Keywize for a calm, guided intake, or continue with the form below.
            </p>
            <ElevenLabsIntakeVoice />
            <div className="my-10 flex items-center gap-4" aria-hidden="true">
              <div className="h-px flex-1 bg-black/10" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
                Or continue with the form
              </span>
              <div className="h-px flex-1 bg-black/10" />
            </div>
            <div className="mx-auto mb-6 max-w-2xl">
              <h2 className="font-serif text-3xl tracking-tight">Tell us what happened</h2>
              <p className="mt-1 text-gray-500">
                Prefer not to talk? You can complete the same intake here at any time.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-serif tracking-tight mb-1">Tell us what happened</h1>
            <p className="text-gray-500 mb-8 text-lg">We will use this to negotiate the best possible rate.</p>
          </>
        )}

        <form
          id="manual-intake"
          onSubmit={handleSubmit}
          className={`bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-black/5 min-h-[400px] flex flex-col ${isVoiceMode ? "mx-auto max-w-2xl" : ""}`}
        >
          {step === 1 && (
            <div className="space-y-8 flex-1 flex flex-col animate-slide-up">
              <h2 className="text-xl font-bold tracking-tight border-b border-black/5 pb-2">
                Situation &amp; Urgency
              </h2>

              <fieldset className="space-y-3">
                <legend className="font-semibold block text-sm">What is your lockout situation?</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CASES.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center p-4 border rounded-2xl cursor-pointer transition-all ${form.caseType === item.id ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]" : "border-gray-200 hover:border-gray-300"}`}
                    >
                      <input type="radio" name="caseType" value={item.id} checked={form.caseType === item.id} onChange={e => set("caseType", e.target.value)} className="sr-only" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <p className="font-semibold text-sm">New keys needed</p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map(n => (
                    <button key={n} type="button" onClick={() => set("newKeysNeeded", n)} className={`w-12 h-12 rounded-xl font-medium text-sm border transition-all ${form.newKeysNeeded === n ? "bg-[#111111] text-white border-[#111111]" : "border-gray-200 hover:border-gray-300"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="font-semibold text-sm">Urgency</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { id: "locked_out_now", label: "Locked out NOW" },
                    { id: "today", label: "Today" },
                    { id: "scheduled", label: "Scheduled" },
                  ].map(u => (
                    <label key={u.id} className={`text-center py-3 text-sm font-medium rounded-xl border cursor-pointer transition-all ${form.urgency === u.id ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="urgency" value={u.id} checked={form.urgency === u.id} onChange={e => set("urgency", e.target.value)} className="sr-only" />
                      {u.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-auto pt-8">
                <button type="button" onClick={() => setStep(2)} className="w-full py-4 rounded-full font-medium text-white bg-[#111111] hover:bg-gray-800 transition-all shadow-md">
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 flex-1 flex flex-col animate-slide-up">
              <h2 className="text-xl font-bold tracking-tight border-b border-black/5 pb-2">
                Location &amp; Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="locationCity" className="font-semibold text-sm">City</label>
                  <input id="locationCity" name="locationCity" autoComplete="address-level2" type="text" value={form.locationCity} onChange={e => set("locationCity", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 transition-all text-sm" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="locationZip" className="font-semibold text-sm">ZIP Code</label>
                  <input id="locationZip" name="locationZip" autoComplete="postal-code" inputMode="numeric" type="text" value={form.locationZip} onChange={e => set("locationZip", e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 transition-all text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="propertyType" className="font-semibold text-sm">Property type</label>
                  <select id="propertyType" name="propertyType" value={form.propertyType} onChange={e => set("propertyType", e.target.value)} className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 transition-all text-sm">
                    <option value="apartment">Apartment</option>
                    <option value="dorm">Dorm</option>
                    <option value="house">House</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="doorType" className="font-semibold text-sm">Door type</label>
                  <select id="doorType" name="doorType" value={form.doorType} onChange={e => set("doorType", e.target.value)} className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 transition-all text-sm">
                    <option value="main_entry">Main entry</option>
                    <option value="room">Room door</option>
                    <option value="building_entry">Building entry</option>
                    <option value="storage">Storage</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="lockType" className="font-semibold text-sm">Lock type</label>
                  <select id="lockType" name="lockType" value={form.lockType} onChange={e => set("lockType", e.target.value)} className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/20 transition-all text-sm">
                    <option value="deadbolt">Deadbolt</option>
                    <option value="knob">Knob</option>
                    <option value="lever">Lever</option>
                    <option value="smart_lock">Smart lock</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div className="mt-auto pt-8 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                <button type="button" onClick={() => setStep(1)} className="w-full sm:w-1/3 py-4 rounded-full font-medium text-[#111111] border border-gray-200 hover:bg-gray-50 transition-all">
                  Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="w-full sm:w-2/3 py-4 rounded-full font-medium text-white bg-[#111111] hover:bg-gray-800 transition-all shadow-md">
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 flex-1 flex flex-col animate-slide-up">
              <h2 className="text-xl font-bold tracking-tight border-b border-black/5 pb-2">
                Budget &amp; Flexibility
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label htmlFor="idealPrice" className="font-semibold text-sm">Ideal price</label>
                      <p className="text-xs text-gray-500">The amount you would prefer to pay.</p>
                    </div>
                    <output htmlFor="idealPrice" className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-[#30a985]">
                      ${form.idealPrice}
                    </output>
                  </div>
                  <input id="idealPrice" name="idealPrice" type="range" min="30" max="300" step="5" value={form.idealPrice} onChange={e => set("idealPrice", parseInt(e.target.value))} className="w-full accent-[#30a985]" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <label htmlFor="maxPrice" className="font-semibold text-sm">Absolute Max Budget</label>
                      <p className="text-xs text-gray-500">We will disqualify any vendor who refuses to cap their price under this amount.</p>
                    </div>
                    <output htmlFor="maxPrice" className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-bold text-pink-600">
                      ${form.maxPrice}
                    </output>
                  </div>
                  <input id="maxPrice" name="maxPrice" type="range" min="50" max="500" step="10" value={form.maxPrice} onChange={e => set("maxPrice", parseInt(e.target.value))} className="w-full accent-[#111111]" />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="font-semibold text-sm">Budget flexibility</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { id: "strict", label: "Strict" },
                    { id: "flexible_for_speed", label: "Flexible for speed" },
                    { id: "flexible_for_rekey", label: "Flexible for rekey" },
                  ].map(b => (
                    <label key={b.id} className={`text-center py-3 text-xs font-medium rounded-xl border cursor-pointer transition-all ${form.budgetFlexibility === b.id ? "border-[#111111] bg-gray-50 ring-1 ring-[#111111]" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="budgetFlexibility" value={b.id} checked={form.budgetFlexibility === b.id} onChange={e => set("budgetFlexibility", e.target.value)} className="sr-only" />
                      {b.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-auto pt-8 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                <button type="button" onClick={() => setStep(2)} className="w-full sm:w-1/3 py-4 rounded-full font-medium text-[#111111] border border-gray-200 hover:bg-gray-50 transition-all">
                  Back
                </button>
                <button type="button" onClick={() => setStep(4)} className="w-full sm:w-2/3 py-4 rounded-full font-medium text-white bg-[#111111] hover:bg-gray-800 transition-all shadow-md">
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 flex-1 flex flex-col animate-slide-up">
              <h2 className="text-xl font-bold tracking-tight border-b border-black/5 pb-2">
                Final Confirmation
              </h2>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
                <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-2">Overview</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm pb-4 border-b border-gray-200/60">
                  <div>
                    <span className="block text-gray-500">Situation</span>
                    <span className="font-medium">{CASES.find(c => c.id === form.caseType)?.label || form.caseType}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">New Keys Needed</span>
                    <span className="font-medium">{form.newKeysNeeded}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Urgency</span>
                    <span className="font-medium capitalize">{form.urgency.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm py-4 border-b border-gray-200/60">
                  <div>
                    <span className="block text-gray-500">City</span>
                    <span className="font-medium">{form.locationCity}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">ZIP Code</span>
                    <span className="font-medium">{form.locationZip}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Property Type</span>
                    <span className="font-medium capitalize">{form.propertyType}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Door Type</span>
                    <span className="font-medium capitalize">{form.doorType.replace(/_/g, " ")}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Lock Type</span>
                    <span className="font-medium capitalize">{form.lockType.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm pt-4">
                  <div>
                    <span className="block text-gray-500">Ideal Price</span>
                    <span className="font-medium">${form.idealPrice}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Max Budget</span>
                    <span className="font-medium">${form.maxPrice}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Budget Flexibility</span>
                    <span className="font-medium capitalize">{form.budgetFlexibility.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">Execution mode</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMissionMode("reliable_demo")}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      missionMode === "reliable_demo"
                        ? "border-black bg-[#f0fbf7]"
                        : "border-black/10 hover:border-black/30"
                    }`}
                  >
                    <span className="block text-sm font-bold">Reliable Demo</span>
                    <span className="mt-1 block text-xs leading-relaxed text-gray-600">
                      Disclosed simulated vendors with deterministic, state-backed results.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMissionMode("live_sandbox")}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      missionMode === "live_sandbox"
                        ? "border-black bg-[#fff3f5]"
                        : "border-black/10 hover:border-black/30"
                    }`}
                  >
                    <span className="block text-sm font-bold">Live Sandbox Proof</span>
                    <span className="mt-1 block text-xs leading-relaxed text-gray-600">
                      Controlled team endpoints only, with visible reliable fallback.
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex items-start mt-1">
                    <input
                      id="authorizationConfirmed"
                      name="authorizationConfirmed"
                      type="checkbox"
                      required
                      checked={form.authorizationConfirmed}
                      onChange={e => set("authorizationConfirmed", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#111111] focus:ring-[#111111]"
                    />
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-red-600 block">Required for service</span>
                    <span className="text-gray-600">I confirm that I am authorized to enter this property. I understand the locksmith will require government-issued ID and proof of residence upon arrival.</span>
                  </div>
                </label>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="mt-auto pt-8 flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
                <button type="button" onClick={() => setStep(3)} className="w-full sm:w-1/3 py-4 rounded-full font-medium text-[#111111] border border-gray-200 hover:bg-gray-50 transition-all">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!form.authorizationConfirmed || isSubmitting}
                  className={`w-full sm:w-2/3 py-4 rounded-full font-medium text-white transition-all shadow-md flex items-center justify-center gap-2
                    ${!form.authorizationConfirmed ? "bg-gray-300 cursor-not-allowed" : "bg-[#111111] hover:bg-gray-800 active:scale-95 shadow-black/10"}`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Creating Mission...
                    </span>
                  ) : "Find Locksmiths →"}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

function IntakeLoading() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] px-6 py-24 text-center text-sm text-gray-500">
      Loading intake...
    </div>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<IntakeLoading />}>
      <IntakePageContent />
    </Suspense>
  );
}
