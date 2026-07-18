import { NextResponse } from "next/server";

const SUPPORTED_TOOLS = new Set([
  "create_job_spec",
  "save_quote",
  "analyze_voice_trust",
  "classify_vendor_tone",
  "update_negotiation",
] as const);

type SupportedToolName =
  | "create_job_spec"
  | "save_quote"
  | "analyze_voice_trust"
  | "classify_vendor_tone"
  | "update_negotiation";

type ElevenLabsToolRequest = {
  tool?: unknown;
  payload?: unknown;
  tool_name?: unknown;
  name?: unknown;
  toolCall?: {
    name?: unknown;
  };
  parameters?: unknown;
  args?: unknown;
  input?: unknown;
};

type ParsedPayloadResult =
  | {
      ok: true;
      payload: unknown;
    }
  | {
      ok: false;
      error: string;
    };

function getToolName(body: ElevenLabsToolRequest): string | undefined {
  const candidates = [body.tool, body.tool_name, body.name, body.toolCall?.name];
  const toolName = candidates.find((candidate): candidate is string => typeof candidate === "string");

  return toolName;
}

function getRawPayload(body: ElevenLabsToolRequest): unknown {
  if (Object.hasOwn(body, "payload")) {
    return body.payload;
  }

  if (Object.hasOwn(body, "parameters")) {
    return body.parameters;
  }

  if (Object.hasOwn(body, "args")) {
    return body.args;
  }

  if (Object.hasOwn(body, "input")) {
    return body.input;
  }

  return {};
}

function parseToolPayload(rawPayload: unknown): ParsedPayloadResult {
  if (typeof rawPayload !== "string") {
    return {
      ok: true,
      payload: rawPayload,
    };
  }

  try {
    return {
      ok: true,
      payload: JSON.parse(rawPayload),
    };
  } catch {
    return {
      ok: false,
      error: "Invalid JSON in payload string.",
    };
  }
}

function methodNotAllowed() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Use POST with a JSON body.",
      supportedMethods: ["POST"],
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

export async function POST(request: Request) {
  let body: ElevenLabsToolRequest;

  try {
    body = (await request.json()) as ElevenLabsToolRequest;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const toolName = getToolName(body);

  if (!toolName || !SUPPORTED_TOOLS.has(toolName as SupportedToolName)) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported tool name.",
        receivedToolName: toolName ?? null,
        supportedToolNames: Array.from(SUPPORTED_TOOLS),
      },
      { status: 400 },
    );
  }

  const parsedPayload = parseToolPayload(getRawPayload(body));

  if (!parsedPayload.ok) {
    return NextResponse.json(
      {
        success: false,
        error: parsedPayload.error,
      },
      { status: 400 },
    );
  }

  console.log("ElevenLabs tool call received", {
    toolName,
    payload: parsedPayload.payload,
  });

  return NextResponse.json({
    success: true,
    toolName,
    message: "Tool call accepted. Payload was parsed; no data was persisted and no external services were called.",
    result: {
      status: "accepted",
      payload: parsedPayload.payload,
    },
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
