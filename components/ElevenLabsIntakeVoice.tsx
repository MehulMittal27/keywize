"use client";

import {
  ConversationProvider,
  useConversation,
  type Callbacks,
} from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type TranscriptSnippet = {
  id: number;
  role: "user" | "agent";
  message: string;
};

type AgentToolResponse = Parameters<
  NonNullable<Callbacks["onAgentToolResponse"]>
>[0];

const SAFE_MISSION_ID = /^[a-zA-Z0-9_-]{1,128}$/;

function extractMissionId(value: unknown, depth = 0): string | null {
  if (depth > 4 || !value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return extractMissionId(JSON.parse(value), depth + 1);
    } catch {
      return null;
    }
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const directId = record.missionId ?? record.mission_id;

  if (typeof directId === "string" && SAFE_MISSION_ID.test(directId)) {
    return directId;
  }

  for (const key of ["result", "data", "output", "response"]) {
    const nestedId = extractMissionId(record[key], depth + 1);
    if (nestedId) {
      return nestedId;
    }
  }

  return null;
}

function getResponseError(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "Voice intake is unavailable right now. Please use the manual form below.";
  }

  const body = value as Record<string, unknown>;
  const error = typeof body.error === "string" ? body.error : null;
  const message = typeof body.message === "string" ? body.message : null;

  return [error, message].filter(Boolean).join(" ") ||
    "Voice intake is unavailable right now. Please use the manual form below.";
}

function friendlySessionError(message?: string): string {
  const normalized = message?.toLowerCase() ?? "";

  if (
    normalized.includes("microphone") ||
    normalized.includes("permission") ||
    normalized.includes("notallowed") ||
    normalized.includes("not allowed") ||
    normalized.includes("denied")
  ) {
    return "Microphone access was blocked. Allow microphone access in your browser settings, then try again.";
  }

  return "The voice session could not start. Check your microphone and connection, or continue with the manual form.";
}

function ElevenLabsIntakePanel() {
  const router = useRouter();
  const [transcript, setTranscript] = useState<TranscriptSnippet[]>([]);
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const transcriptIdRef = useRef(0);
  const isNavigatingRef = useRef(false);

  const handleMessage = useCallback(
    (payload: Parameters<NonNullable<Callbacks["onMessage"]>>[0]) => {
      const message = payload.message.trim();
      if (!message) {
        return;
      }

      transcriptIdRef.current += 1;
      setTranscript((current) =>
        [
          ...current,
          {
            id: transcriptIdRef.current,
            role: payload.role,
            message,
          },
        ].slice(-6)
      );
    },
    []
  );

  const handleAgentToolResponse = useCallback(
    (payload: AgentToolResponse) => {
      if (
        payload.tool_name !== "create_job_spec" ||
        payload.is_error ||
        !("full_tool_result" in payload) ||
        isNavigatingRef.current
      ) {
        return;
      }

      const missionId = extractMissionId(payload.full_tool_result);
      if (!missionId) {
        return;
      }

      isNavigatingRef.current = true;
      setNotice("Mission created. Opening your mission dashboard...");
      router.push(`/mission/${encodeURIComponent(missionId)}`);
    },
    [router]
  );

  const conversation = useConversation({
    onMessage: handleMessage,
    onAgentToolResponse: handleAgentToolResponse,
    onError: (message) => {
      setIsPreparing(false);
      setLocalError(friendlySessionError(message));
    },
    onDisconnect: (details) => {
      setIsPreparing(false);
      if (details.reason === "error") {
        setLocalError(friendlySessionError(details.message));
      } else if (details.reason === "agent" && !isNavigatingRef.current) {
        setNotice(
          "The voice session ended. If a mission did not open, finish with the manual form below."
        );
      }
    },
  });

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  const startVoiceIntake = async () => {
    setLocalError("");
    setNotice("");
    setTranscript([]);
    isNavigatingRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setLocalError(
        "This browser cannot access a microphone. Continue with the manual form below."
      );
      return;
    }

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setIsPreparing(true);

    try {
      const response = await fetch("/api/elevenlabs/signed-url", {
        cache: "no-store",
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getResponseError(body));
      }

      const signedUrl =
        body && typeof body === "object"
          ? (body as Record<string, unknown>).signedUrl
          : null;

      if (typeof signedUrl !== "string" || !signedUrl) {
        throw new Error(
          "Voice intake received an invalid session. Please try again or use the manual form."
        );
      }

      conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        textOnly: false,
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setLocalError(
          error instanceof Error
            ? error.message
            : "Voice intake is unavailable right now. Please use the manual form below."
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setIsPreparing(false);
      }
    }
  };

  const endVoiceIntake = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsPreparing(false);
    conversation.endSession();
  };

  const isActive =
    isPreparing ||
    conversation.status === "connecting" ||
    conversation.status === "connected";
  const displayError =
    localError ||
    (conversation.status === "error"
      ? friendlySessionError(conversation.message)
      : "");

  let statusLabel = "Ready to start";
  let statusColor = "bg-gray-300";

  if (displayError) {
    statusLabel = "Voice unavailable";
    statusColor = "bg-pink-500";
  } else if (isPreparing) {
    statusLabel = "Preparing a secure session";
    statusColor = "bg-amber-400 animate-pulse";
  } else if (conversation.status === "connecting") {
    statusLabel = "Connecting to Intake";
    statusColor = "bg-amber-400 animate-pulse";
  } else if (conversation.status === "connected") {
    statusLabel =
      conversation.mode === "speaking" ? "Intake is speaking" : "Listening to you";
    statusColor = "bg-[#30a985] animate-pulse";
  } else if (transcript.length > 0) {
    statusLabel = "Conversation ended";
  }

  return (
    <section
      aria-labelledby="voice-intake-heading"
      className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-xl shadow-black/5"
    >
      <div className="bg-[linear-gradient(135deg,#eaf9f3_0%,#fff8fb_100%)] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-lg">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#30a985]/20 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#217c64]">
              <span className="h-2 w-2 rounded-full bg-[#30a985]" />
              ElevenLabs Intake
            </div>
            <h2 id="voice-intake-heading" className="font-serif text-3xl tracking-tight">
              Talk through your lockout
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Intake will gather your situation, location, timing, and maximum budget,
              then confirm authorization before creating a mission.
            </p>
          </div>

          <div
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-black/5 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
            {statusLabel}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {!isActive ? (
            <button
              type="button"
              onClick={startVoiceIntake}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:bg-gray-800 active:scale-95"
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              {transcript.length > 0 ? "Start again" : "Start voice intake"}
            </button>
          ) : (
            <button
              type="button"
              onClick={endVoiceIntake}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:bg-gray-800 active:scale-95"
            >
              <span aria-hidden="true" className="h-3 w-3 rounded-sm bg-white" />
              End voice intake
            </button>
          )}
          <a
            href="#manual-intake"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-gray-50"
          >
            Use manual intake
          </a>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">Before you begin</p>
            <p className="mt-1">
              Your browser will ask for microphone access. Allow it for this site and
              check that the correct microphone is selected. Headphones can reduce echo.
            </p>
          </div>
          <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-4 text-sm leading-6 text-gray-700">
            <p className="font-semibold text-pink-800">Authorization is required</p>
            <p className="mt-1">
              Only request service for a property you are authorized to enter. Have a
              government-issued ID and proof of residence ready for the locksmith.
            </p>
          </div>
        </div>

        <div className="min-h-52 rounded-2xl border border-gray-100 bg-[#fbfaf7] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Live transcript</h3>
            <span className="text-xs text-gray-600">Latest snippets only</span>
          </div>

          {transcript.length > 0 ? (
            <ol className="space-y-3" aria-live="polite">
              {transcript.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-2xl px-4 py-3 text-sm leading-5 ${
                    item.role === "user"
                      ? "ml-6 bg-[#111111] text-white"
                      : "mr-6 border border-black/5 bg-white text-gray-700"
                  }`}
                >
                  <span
                    className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${
                      item.role === "user" ? "text-white/60" : "text-[#30a985]"
                    }`}
                  >
                    {item.role === "user" ? "You" : "Keywize Intake"}
                  </span>
                  {item.message}
                </li>
              ))}
            </ol>
          ) : (
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 px-6 text-center text-sm leading-6 text-gray-600">
              User and Intake transcript snippets will appear here after the session starts.
            </div>
          )}
        </div>
      </div>

      {(displayError || notice) && (
        <div
          className={`mx-6 mb-6 rounded-2xl border px-4 py-3 text-sm leading-6 sm:mx-8 sm:mb-8 ${
            displayError
              ? "border-pink-200 bg-pink-50 text-pink-900"
              : "border-[#30a985]/20 bg-[#eaf9f3] text-[#185f4d]"
          }`}
          role={displayError ? "alert" : "status"}
        >
          {displayError || notice}
        </div>
      )}
    </section>
  );
}

export function ElevenLabsIntakeVoice() {
  return (
    <ConversationProvider>
      <ElevenLabsIntakePanel />
    </ConversationProvider>
  );
}

export default ElevenLabsIntakeVoice;
