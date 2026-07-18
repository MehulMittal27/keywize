import { NextRequest, NextResponse } from "next/server";
import type { VoiceTrustInput } from "@/lib/types";
import { analyzeVoiceTrust } from "@/lib/voiceTrust";
import { getMission, setMission } from "@/lib/store";

/**
 * POST /api/voice-trust
 *
 * Analyzes a vendor response for hesitation and evasion signals.
 * Optionally attaches the result to a quote if missionId is provided.
 *
 * Body: VoiceTrustInput & { missionId?: string }
 */
export async function POST(request: NextRequest) {
  let body: VoiceTrustInput & { missionId?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.quoteId || !body.questionType || body.vendorText === undefined) {
    return NextResponse.json(
      { error: "quoteId, questionType, and vendorText are required" },
      { status: 422 }
    );
  }

  if (body.pauseMs === undefined || body.pauseMs === null) {
    return NextResponse.json(
      { error: "pauseMs is required" },
      { status: 422 }
    );
  }

  const signal = analyzeVoiceTrust(body);

  // If missionId is provided, attach the signal to the matching quote
  if (body.missionId) {
    const mission = getMission(body.missionId);
    if (mission) {
      const quoteIdx = mission.quotes.findIndex((q) => q.id === body.quoteId);
      if (quoteIdx !== -1) {
        const quote = { ...mission.quotes[quoteIdx] };
        quote.voiceTrustSignals = [...quote.voiceTrustSignals, signal];
        // Update composite voiceTrustScore as average of all signals
        const scores = quote.voiceTrustSignals.map((s) => s.confidenceScore);
        quote.voiceTrustScore = Math.round(
          scores.reduce((a, b) => a + b, 0) / scores.length
        );
        mission.quotes[quoteIdx] = quote;
        setMission(mission);
      }
    }
  }

  return NextResponse.json(signal, { status: 201 });
}
