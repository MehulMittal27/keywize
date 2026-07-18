const INTAKE_MESSAGE =
  "Thanks for calling Keywize. We will connect you to our lockout intake agent.";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function POST() {
  // TODO: Connect this call to the future ElevenLabs lockout intake agent.
  // TODO: Alternatively, start a Twilio Media Stream here for real-time audio.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml(
    INTAKE_MESSAGE,
  )}</Say></Response>`;

  return new Response(twiml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}

export async function GET() {
  return POST();
}
