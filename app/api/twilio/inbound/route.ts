import { NextResponse } from "next/server";

/**
 * POST /api/twilio/inbound
 *
 * Twilio webhook for inbound calls to the Keywize phone number.
 * Returns TwiML that connects the caller to the ElevenLabs intake agent.
 *
 * To connect a real call:
 *   1. Buy a Twilio number (see docs/TWILIO_SETUP.md)
 *   2. Set the Voice webhook URL to: https://your-domain.com/api/twilio/inbound
 *   3. Configure the ElevenLabs agent phone number ID to your Twilio number
 *
 * Current behavior: greets the caller and shows a placeholder for
 * the ElevenLabs media stream connection.
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
