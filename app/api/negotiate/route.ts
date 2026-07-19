import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { missionId } = body;

    if (!missionId) {
      return NextResponse.json({ error: "missionId is required" }, { status: 400 });
    }

    // Negotiation result: Vendor C (Premium Secure) drops from $165 to $145
    // "I have a confirmed quote at $130 all-in with no-drill-first. Can you match it or include two keys?"
    const negotiationResult = {
      missionId,
      vendorName: "Premium Secure",
      originalPrice: 165,
      negotiatedPrice: 145,
      priceOrTermsChanged: true,
      negotiationLine:
        "I have a confirmed quote at $130 all-in with no-drill-first. Can you match it or include two keys?",
      vendorResponse:
        "Um, we can drop it to $145 if you book right now.",
      voiceTrustAlert: "Low confidence on price confirmation — hesitation detected before responding.",
    };

    return NextResponse.json({
      success: true,
      result: negotiationResult,
    });
  } catch (err) {
    console.error("Negotiate error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
