import { NextResponse } from "next/server";

/**
 * POST /api/twilio/inbound
 *
 * Twilio webhook stub for customer-inbound calls to Keywize.
 * Current behavior is two static messages followed by disconnect; it does not
 * connect an ElevenLabs agent. Never use this route as a live sandbox vendor
 * destination. See docs/TWILIO_SETUP.md for that provider boundary.
 */
export async function POST() {
  // TwiML response
  // In production: replace <Say> with <Connect><Stream> pointing to your ElevenLabs agent
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna" language="en-US">
    Thanks for calling Keywize. We will connect you to our lockout intake agent right now.
    Please stay on the line.
  </Say>
  <!-- TODO: Replace with ElevenLabs media stream -->
  <!-- 
  <Connect>
    <Stream url="wss://api.elevenlabs.io/v1/convai/call?agent_id=YOUR_AGENT_ID" />
  </Connect>
  -->
  <Say voice="Polly.Joanna">
    Our agent is not yet connected to this number. Please use the website at keywize.com to start your lockout case online.
  </Say>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
