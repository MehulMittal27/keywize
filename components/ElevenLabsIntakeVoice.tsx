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

type VoiceSessionState =
  | "ready"
  | "preparing"
  | "connecting"
  | "connected"
  | "interrupted"
  | "ended"
  | "failed";

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
  if (value && typeof value === "object") {
    const body = value as Record<string, unknown>;
    const details = [body.error, body.message]
      .filter((item): item is string => typeof item === "string")
      .join(" ")
      .toLowerCase();

    if (details.includes("rate limit") || details.includes("busy")) {
      return "Voice intake is busy right now. Try again in a moment, or continue below.";
    }
  }

  return "Voice intake is not available right now. You can try again or continue below.";
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
    return "Microphone access is off. Allow it for this site, then try again.";
  }

  return "We could not connect the voice call. Try again, or continue below.";
}

function latestMessage(
  transcript: TranscriptSnippet[],
  role: TranscriptSnippet["role"]
): string | null {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    if (transcript[index].role === role) {
      return transcript[index].message;
    }
  }

  return null;
}

function ElevenLabsIntakePanel() {
  const router = useRouter();
  const [transcript, setTranscript] = useState<TranscriptSnippet[]>([]);
  const [sessionState, setSessionState] = useState<VoiceSessionState>("ready");
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const transcriptIdRef = useRef(0);
  const sessionConnectedRef = useRef(false);
  const sessionEstablishedRef = useRef(false);
  const transcriptActivityRef = useRef(false);
  const isEndingRef = useRef(false);
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
        ].slice(-8)
      );

      // Transcript activity proves the session is live. Some recoverable SDK
      // errors use onError without ending the conversation, so they must not
      // leave a failed-session banner over an active call.
      if (!isEndingRef.current) {
        sessionConnectedRef.current = true;
        sessionEstablishedRef.current = true;
        transcriptActivityRef.current = true;
        setLocalError("");
        setSessionState("connected");
      }
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
      setNotice("Your mission is ready. Opening it now...");
      router.push(`/mission/${encodeURIComponent(missionId)}`);
    },
    [router]
  );

  const conversation = useConversation({
    onConnect: () => {
      if (isEndingRef.current) {
        return;
      }

      sessionConnectedRef.current = true;
      sessionEstablishedRef.current = true;
      setLocalError("");
      setSessionState("connected");
    },
    onStatusChange: ({ status }) => {
      if (isEndingRef.current) {
        return;
      }

      if (status === "connecting" && !sessionConnectedRef.current) {
        setSessionState("connecting");
      } else if (status === "connected") {
        sessionConnectedRef.current = true;
        sessionEstablishedRef.current = true;
        setLocalError("");
        setSessionState("connected");
      }
    },
    onMessage: handleMessage,
    onAgentToolResponse: handleAgentToolResponse,
    onError: (message) => {
      // The SDK also emits onError for recoverable runtime issues. A failure is
      // user-facing only when the call never connected, or when onDisconnect
      // later confirms that an active session ended because of an error.
      if (
        isEndingRef.current ||
        sessionConnectedRef.current ||
        sessionEstablishedRef.current
      ) {
        return;
      }

      setSessionState("failed");
      setLocalError(friendlySessionError(message));
    },
    onDisconnect: (details) => {
      const endedByUser = isEndingRef.current || details.reason === "user";
      const wasEstablished = sessionEstablishedRef.current;
      const hadTranscriptActivity = transcriptActivityRef.current;
      sessionConnectedRef.current = false;
      isEndingRef.current = false;

      if (endedByUser) {
        setLocalError("");
        setSessionState("ended");
        return;
      }

      if (details.reason === "error") {
        if (wasEstablished) {
          setLocalError("");
          setSessionState("interrupted");
          if (!isNavigatingRef.current) {
            setNotice(
              hadTranscriptActivity
                ? "The voice call was interrupted. Your latest conversation is still here. Try again or continue below."
                : "The voice call was interrupted. Try again or continue below."
            );
          }
          return;
        }

        setSessionState("failed");
        setLocalError(friendlySessionError(details.message));
        return;
      }

      setLocalError("");
      setSessionState("ended");
      if (!isNavigatingRef.current) {
        setNotice("Call complete. If your mission did not open, you can finish below.");
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
    sessionConnectedRef.current = false;
    sessionEstablishedRef.current = false;
    transcriptActivityRef.current = false;
    isEndingRef.current = false;
    isNavigatingRef.current = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setSessionState("failed");
      setLocalError(
        "This browser cannot use a microphone. You can continue with the form below."
      );
      return;
    }

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setSessionState("preparing");

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
          "Voice intake is not available right now. You can try again or continue below."
        );
      }

      if (controller.signal.aborted) {
        return;
      }

      setSessionState("connecting");
      conversation.startSession({
        signedUrl,
        connectionType: "websocket",
        textOnly: false,
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setSessionState("failed");
        setLocalError(
          error instanceof Error
            ? error.message
            : "Voice intake is not available right now. You can continue below."
        );
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
      }
    }
  };

  const endVoiceIntake = () => {
    isEndingRef.current = true;
    requestRef.current?.abort();
    requestRef.current = null;
    sessionConnectedRef.current = false;
    setSessionState("ended");
    setLocalError("");
    setNotice("Call ended. You can start again or continue below.");
    conversation.endSession();
  };

  const isActive = ["preparing", "connecting", "connected"].includes(
    sessionState
  );
  const displayError = sessionState === "failed" ? localError : "";
  const currentQuestion = latestMessage(transcript, "agent");
  const currentResponse = latestMessage(transcript, "user");

  let statusLabel = "Ready";
  let statusDetail = "Start whenever you feel ready";
  let statusTone = "bg-gray-300";

  if (sessionState === "preparing" || sessionState === "connecting") {
    statusLabel = "Connecting";
    statusDetail = "Joining your voice call";
    statusTone = "bg-amber-400 animate-pulse";
  } else if (sessionState === "connected") {
    statusLabel = conversation.mode === "speaking" ? "Speaking" : "Listening";
    statusDetail =
      conversation.mode === "speaking"
        ? "Keywize is speaking"
        : "Your microphone is on";
    statusTone = "bg-[#30a985] animate-pulse";
  } else if (sessionState === "interrupted") {
    statusLabel = "Call interrupted";
    statusDetail = "Your conversation is still here";
    statusTone = "bg-amber-400";
  } else if (sessionState === "ended") {
    statusLabel = "Call ended";
    statusDetail = "Start again or continue with the form";
  } else if (sessionState === "failed") {
    statusLabel = "Voice unavailable";
    statusDetail = "The call did not connect";
    statusTone = "bg-pink-500";
  }

  let prompt = "What happened with your lock?";

  if (currentQuestion) {
    prompt = currentQuestion;
  } else if (sessionState === "preparing" || sessionState === "connecting") {
    prompt = "Just a moment while I set up the call.";
  } else if (sessionState === "connected") {
    prompt =
      conversation.mode === "speaking"
        ? "Keywize is speaking."
        : "Go ahead. What happened with your lock?";
  } else if (sessionState === "interrupted") {
    prompt = "Your call was interrupted. Start again when you are ready.";
  } else if (sessionState === "ended") {
    prompt = "Your call has ended. Start again if you would like to keep talking.";
  } else if (sessionState === "failed") {
    prompt = "No problem. We can continue another way.";
  }

  return (
    <section
      aria-labelledby="voice-intake-heading"
      className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-2xl shadow-black/[0.06]"
    >
      <div className="bg-[linear-gradient(135deg,#e7f8f1_0%,#fff9fb_58%,#f7f2ff_100%)] px-6 pb-7 pt-6 sm:px-10 sm:pb-9 sm:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#30a985]/20 bg-white/75 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#217c64] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#30a985]" />
              Voice intake
            </div>
            <h2
              id="voice-intake-heading"
              className="font-serif text-3xl tracking-tight sm:text-4xl"
            >
              Let&apos;s talk it through
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-gray-600">
              A calm, guided conversation to understand your lockout and budget.
              One question at a time.
            </p>
          </div>
          <p className="max-w-xs text-xs leading-5 text-gray-500 sm:text-right">
            You will be asked for microphone access. Headphones can help reduce echo.
          </p>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div
            className={`relative flex h-28 w-28 items-center justify-center rounded-full border-8 border-white shadow-xl ring-1 ring-black/5 transition-colors sm:h-32 sm:w-32 ${
              sessionState === "connected"
                ? "bg-[#dff6ed]"
                : sessionState === "failed"
                  ? "bg-pink-50"
                  : "bg-[#f4f1ea]"
            }`}
            aria-hidden="true"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center gap-1 rounded-full text-white shadow-lg sm:h-[4.5rem] sm:w-[4.5rem] ${
                sessionState === "failed" ? "bg-pink-500" : "bg-[#111111]"
              }`}
            >
              {[12, 22, 30, 18, 10].map((height, index) => (
                <span
                  key={height}
                  className={`w-1 rounded-full bg-white/90 ${
                    sessionState === "connected" ? "animate-pulse" : ""
                  }`}
                  style={{
                    height,
                    animationDelay: `${index * 120}ms`,
                  }}
                />
              ))}
            </div>
            {sessionState === "connected" && (
              <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#30a985]/10" />
            )}
          </div>

          <div
            className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-black/5 bg-white px-4 py-2 shadow-sm"
            role="status"
            aria-live="polite"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${statusTone}`} />
            <span className="font-semibold text-[#111111]">{statusLabel}</span>
            <span className="hidden text-xs text-gray-500 sm:inline">
              {statusDetail}
            </span>
          </div>

          <div
            className="mt-6 w-full rounded-3xl border border-black/[0.06] bg-[#fbfaf7] px-5 py-5 text-left sm:px-7 sm:py-6"
            aria-live="polite"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#217c64]">
              {currentQuestion ? "Keywize asks" : "Your voice guide"}
            </p>
            <p className="mt-2 font-serif text-xl leading-7 tracking-tight text-[#111111] sm:text-2xl sm:leading-8">
              {prompt}
            </p>
            {currentResponse && (
              <div className="mt-4 border-t border-black/[0.06] pt-4 text-sm leading-6 text-gray-600">
                <span className="mr-2 font-semibold text-gray-900">You said</span>
                {currentResponse}
              </div>
            )}
          </div>

          <div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            {!isActive ? (
              <button
                type="button"
                onClick={startVoiceIntake}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#111111] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-black/15 transition-all hover:bg-gray-800 active:scale-95 sm:w-auto"
              >
                <svg
                  aria-hidden="true"
                  width="19"
                  height="19"
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
                {sessionState === "ready" ? "Start voice call" : "Try voice again"}
              </button>
            ) : (
              <button
                type="button"
                onClick={endVoiceIntake}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#d83c5b] px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-900/15 transition-all hover:bg-[#c93250] active:scale-95 sm:w-auto"
              >
                <svg
                  aria-hidden="true"
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z" />
                  <path d="m8 2 12 12" />
                </svg>
                End call
              </button>
            )}
            <a
              href="#manual-intake"
              className="inline-flex min-h-14 w-full items-center justify-center rounded-full border border-black/10 bg-white px-7 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-gray-50 sm:w-auto"
            >
              Continue with form
            </a>
          </div>

          {(displayError || notice) && (
            <div
              className={`mt-5 w-full rounded-2xl border px-4 py-3 text-left text-sm leading-6 ${
                displayError
                  ? "border-pink-200 bg-pink-50 text-pink-900"
                  : "border-[#30a985]/20 bg-[#eaf9f3] text-[#185f4d]"
              }`}
              role={displayError ? "alert" : "status"}
            >
              {displayError || notice}
            </div>
          )}
        </div>

        {transcript.length > 0 && (
          <details className="group mx-auto mt-7 max-w-2xl rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-gray-600">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-gray-700 marker:hidden">
              <span>Conversation notes</span>
              <span className="flex items-center gap-2 text-xs font-normal text-gray-500">
                {transcript.length} recent {transcript.length === 1 ? "message" : "messages"}
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-open:rotate-180"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </summary>
            <ol className="mt-3 max-h-52 space-y-3 overflow-y-auto border-t border-black/[0.06] pt-3">
              {transcript.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[4.5rem_1fr] gap-3 text-left leading-5"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {item.role === "user" ? "You" : "Keywize"}
                  </span>
                  <span>{item.message}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>

      <div className="border-t border-black/[0.05] bg-[#fbfaf7] px-6 py-5 sm:px-10">
        <div className="flex items-start gap-3 text-sm leading-6 text-gray-600">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-700">
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <p>
            <span className="font-semibold text-gray-900">For your safety.</span>{" "}
            Only request service where you are authorized to enter. The locksmith
            may ask for ID or proof of residence before starting work.
          </p>
        </div>
      </div>
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
