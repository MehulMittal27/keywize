import { NextResponse } from "next/server";

const ELEVENLABS_SIGNED_URL_ENDPOINT =
  "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";

function getUpstreamErrorMessage(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return "ElevenLabs rejected the server credentials.";
    case 404:
      return "The configured ElevenLabs Intake agent was not found.";
    case 429:
      return "ElevenLabs is rate limited. Try again shortly.";
    default:
      return `ElevenLabs returned HTTP ${status}.`;
  }
}

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const intakeAgentId = process.env.ELEVENLABS_INTAKE_AGENT_ID;
  const missing = [
    !apiKey ? "ELEVENLABS_API_KEY" : null,
    !intakeAgentId ? "ELEVENLABS_INTAKE_AGENT_ID" : null,
  ].filter((name): name is string => Boolean(name));

  if (!apiKey || !intakeAgentId) {
    return NextResponse.json(
      {
        error: "ElevenLabs Intake voice is not configured.",
        message: `Set ${missing.join(" and ")} on the server.`,
      },
      { status: 503 }
    );
  }

  const endpoint = new URL(ELEVENLABS_SIGNED_URL_ENDPOINT);
  endpoint.searchParams.set("agent_id", intakeAgentId);

  try {
    const response = await fetch(endpoint, {
      headers: {
        "xi-api-key": apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const responseText = await response.text();
    let body: unknown = null;

    if (responseText) {
      try {
        body = JSON.parse(responseText);
      } catch {
        body = null;
      }
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "ElevenLabs could not create an Intake voice session.",
          message: getUpstreamErrorMessage(response.status),
        },
        { status: response.status }
      );
    }

    const signedUrl =
      body && typeof body === "object"
        ? (body as Record<string, unknown>).signed_url
        : null;

    if (typeof signedUrl !== "string" || !signedUrl) {
      return NextResponse.json(
        {
          error: "ElevenLabs returned an invalid signed URL response.",
          message: "Try starting the voice session again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { signedUrl },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        error: "Unable to reach ElevenLabs.",
        message: "Check the server connection and try again.",
      },
      { status: 502 }
    );
  }
}
