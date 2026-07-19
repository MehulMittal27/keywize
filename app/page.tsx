import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#111111] font-sans selection:bg-[#30a985] selection:text-white relative overflow-hidden">
      
      {/* Soft background gradients inspired by Image 3 */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#30a985]/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-pink-200/30 blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#111111] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight">Keywize</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-600">
          <Link href="#how-it-works" className="hover:text-black transition-colors">How it works</Link>
          <Link href="#pricing" className="hover:text-black transition-colors">Pricing</Link>
          <Link href="#faq" className="hover:text-black transition-colors">FAQ</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/demo" className="font-medium text-sm hover:text-gray-600 transition-colors hidden sm:block">Log in</Link>
          <Link href="/intake" className="px-5 py-2.5 bg-[#111111] text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10">
            Start Online
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col lg:flex-row items-center max-w-7xl mx-auto px-8 pt-12 pb-24 lg:pt-24 gap-16">
        
        {/* Left: Copy & CTAs */}
        <div className="flex-1 flex flex-col items-start gap-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-black/5 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#30a985] animate-pulse" />
            <span className="text-xs font-semibold tracking-wide uppercase text-gray-600">AI Locksmith Negotiator</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-serif text-[#111111] leading-[1.1] tracking-tight">
            Locked out? <br/>
            Keywize gets you back in <span className="text-gray-400 italic">without getting played.</span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            Start a chat. The Keywize bot takes your details, calls locksmiths on your behalf, detects hidden-fee risk, negotiates under your budget, and recommends the safest deal with transcript evidence.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/intake" className="w-full sm:w-auto px-8 py-4 bg-[#111111] text-white rounded-full font-medium hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Call Keywize
            </Link>
            <Link href="/intake" className="w-full sm:w-auto px-8 py-4 bg-white text-[#111111] rounded-full font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm text-center">
              Start Online
            </Link>
          </div>
          
          <div className="flex items-center gap-6 mt-4 pt-8 border-t border-black/5 w-full">
            <div className="flex flex-col">
              <span className="text-3xl font-serif tracking-tight">68%</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Risk reduced</span>
            </div>
            <div className="w-px h-10 bg-black/5" />
            <div className="flex flex-col">
              <span className="text-3xl font-serif tracking-tight">$40</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Saved</span>
            </div>
            <div className="w-px h-10 bg-black/5" />
            <div className="flex flex-col">
              <span className="text-3xl font-serif tracking-tight">3</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Quotes checked</span>
            </div>
          </div>
        </div>

        {/* Right: Floating Phone/Report Mockup (Inspired by images) */}
        <div className="flex-1 relative w-full max-w-md lg:max-w-none aspect-[4/5] lg:aspect-auto lg:h-[700px] flex items-center justify-center">
          
          {/* Main Phone Card */}
          <div className="absolute w-[320px] h-[650px] bg-white/70 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-2xl shadow-purple-900/10 flex flex-col overflow-hidden z-20">
            {/* Phone Header */}
            <div className="px-6 py-5 border-b border-black/5 bg-white/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#30a985] to-teal-400 flex items-center justify-center shadow-inner">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Keywize AI</h3>
                  <p className="text-[11px] text-[#30a985] font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30a985] inline-block animate-pulse"></span>
                    Negotiating with Vendor C
                  </p>
                </div>
              </div>
            </div>
            
            {/* Phone Body / Chat Interface */}
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto bg-gray-50/30">
              
              <div className="self-end bg-gray-100 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm border border-black/5">
                <p className="text-sm">Can you do better than $165? Another local vendor quoted $130.</p>
              </div>
              
              <div className="self-start flex items-end gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full shrink-0 mb-1 overflow-hidden relative border border-black/5">
                  <Image src="/vendor-avatar.png" alt="Locksmith" fill sizes="24px" className="object-cover" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-black/5">
                  <p className="text-sm text-gray-700">Uh... let me check... we can drop it to $145 if you book right now.</p>
                </div>
              </div>
              
              {/* VoiceTrust Alert Bubble */}
              <div className="self-center my-2 bg-pink-50 border border-pink-100 text-pink-700 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                VoiceTrust hesitation detected
              </div>
              
              <div className="self-end bg-[#111111] text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-md">
                <p className="text-sm">Does the $145 include dispatch, labor, and all fees without drilling?</p>
              </div>
              
            </div>
            
            {/* Input area mockup */}
            <div className="p-4 bg-white/80 border-t border-black/5 flex items-center gap-3">
               <div className="flex-1 bg-gray-100 h-10 rounded-full border border-gray-200 px-4 flex items-center">
                  <span className="text-sm text-gray-400">AI is finalizing terms...</span>
               </div>
               <div className="w-10 h-10 bg-[#111111] rounded-full flex items-center justify-center shrink-0">
                 <div className="w-3 h-3 bg-white rounded-sm animate-pulse" />
               </div>
            </div>
          </div>
          
          {/* Floating Accents */}
          <div className="absolute top-10 right-0 lg:-right-10 px-4 py-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-black/5 border border-black/5 flex items-center gap-3 z-30 transform rotate-2 animate-bounce-slow">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Secured Price</p>
              <p className="text-sm font-bold">$145 all-in</p>
            </div>
          </div>
          
          <div className="absolute bottom-24 -left-8 lg:-left-20 px-4 py-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-black/5 border border-black/5 flex items-center gap-3 z-30 transform -rotate-3">
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Guaranteed</p>
              <p className="text-sm font-bold">No-drill first</p>
            </div>
          </div>
          
        </div>
      </main>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white border-t border-black/5 relative z-10">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 font-semibold text-xs tracking-wide uppercase mb-6">
            Success-Fee Model
          </div>
          <h2 className="text-4xl lg:text-5xl font-serif text-[#111111] leading-[1.1] tracking-tight mb-6">
            We only make money when you save money.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed mb-12">
            The emergency lockout market is plagued by bait-and-switch scams. We don't charge subscription fees. Instead, we take a <strong>20% commission on the verified savings</strong> we negotiate for you.
          </p>

          <div className="bg-[#fbfaf7] rounded-[32px] p-8 md:p-12 border border-black/5 shadow-xl shadow-black/5 text-left flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-6">
              <h3 className="text-2xl font-bold">How it works</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">✗</div>
                  <div>
                    <span className="font-semibold block text-gray-900">The Scam Reality</span>
                    <span className="text-sm text-gray-600">You call the first number on Google. They quote $39. The tech drills your lock and charges you $225.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                  <div>
                    <span className="font-semibold block text-gray-900">The Keywize Way</span>
                    <span className="text-sm text-gray-600">Our AI negotiates a verified all-in price of $85. You save hundreds of dollars and the headache of a broken lock.</span>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="w-full md:w-[320px] bg-white p-6 rounded-2xl border-2 border-[#111111] shadow-lg">
              <h4 className="font-bold text-lg mb-4 border-b border-gray-100 pb-2">Example Bill</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Average Scam Price</span>
                  <span className="line-through">$225.00</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Keywize Negotiated Price</span>
                  <span>$85.00</span>
                </div>
                <div className="flex justify-between font-bold text-green-600 border-t border-gray-100 pt-2">
                  <span>Verified Savings</span>
                  <span>$140.00</span>
                </div>
                <div className="flex justify-between font-medium text-gray-600 mt-4">
                  <span>Keywize Success Fee</span>
                  <span>$15.00</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-[#111111]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">You Pay Total</span>
                  <span className="font-bold text-2xl font-serif text-[#111111]">$100.00</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">You still save $125.00</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
