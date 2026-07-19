import { VENDOR_DEFINITIONS } from "./mockData";
import type { Mission, VendorCall, VendorCallStatus, VendorId } from "./types";

// Vendor A never returns a usable firm quote and is deliberately kept off
// these selection screens - its risk flag surfaces later via the mission
// event log and /report/[id] instead. See HIDDEN_VENDOR_ID in
// app/mission/[id]/page.tsx for the same convention.
const OFFER_VENDOR_IDS: VendorId[] = ["vendor_b", "vendor_c"];

export type BasicOffer = {
  quoteId: string;
  vendorId: VendorId;
  name: string;
  phone: string;
  price: number | null;
  statusLabel: string | null;
};

export type NegotiatedOffer = {
  quoteId: string;
  vendorId: VendorId;
  name: string;
  phone: string;
  basicPrice: number | null;
  negotiatedPrice: number | null;
  statusLabel: string | null;
};

function callerCall(mission: Mission, vendorId: VendorId): VendorCall | undefined {
  return mission.vendorCalls.find((call) => call.vendorId === vendorId && call.role === "caller");
}

function callStatusLabel(status: VendorCallStatus | undefined): string {
  switch (status) {
    case "ringing":
      return "Calling now";
    case "connected":
    case "quote_saved":
      return "On the call";
    case "failed":
      return "Call failed";
    case "replay_fallback":
      return "Using reliable replay";
    default:
      return "Queued to call";
  }
}

// Basic price = pre-negotiation total. Vendor C's stored quote is mutated to
// the negotiated total once terms are secured (see
// demoOrchestrator.completeReliableNegotiation), so the original figure only
// survives in mission.negotiation.beforePrice once that happens.
export function basicOffers(mission: Mission): BasicOffer[] {
  return OFFER_VENDOR_IDS.map((vendorId) => {
    const quote = mission.quotes.find((q) => q.vendorId === vendorId);
    const call = callerCall(mission, vendorId);
    const name = quote?.vendorName ?? call?.vendorName ?? VENDOR_DEFINITIONS[vendorId].vendorName;

    if (!quote) {
      return {
        quoteId: `pending-${vendorId}`,
        vendorId,
        name,
        phone: "",
        price: null,
        statusLabel: callStatusLabel(call?.status),
      };
    }

    const price =
      vendorId === "vendor_c"
        ? (mission.negotiation?.beforePrice ?? quote.totalEstimate)
        : quote.totalEstimate;

    return {
      quoteId: quote.id,
      vendorId,
      name: quote.vendorName,
      phone: quote.phone,
      price,
      statusLabel: null,
    };
  });
}

export function negotiatedOffers(mission: Mission): NegotiatedOffer[] {
  return OFFER_VENDOR_IDS.map((vendorId) => {
    const quote = mission.quotes.find((q) => q.vendorId === vendorId);
    const call = callerCall(mission, vendorId);
    const name = quote?.vendorName ?? call?.vendorName ?? VENDOR_DEFINITIONS[vendorId].vendorName;

    if (!quote) {
      return {
        quoteId: `pending-${vendorId}`,
        vendorId,
        name,
        phone: "",
        basicPrice: null,
        negotiatedPrice: null,
        statusLabel: callStatusLabel(call?.status),
      };
    }

    // Vendor B is the leverage source - it is never itself negotiated.
    if (vendorId === "vendor_b") {
      return {
        quoteId: quote.id,
        vendorId,
        name: quote.vendorName,
        phone: quote.phone,
        basicPrice: quote.totalEstimate,
        negotiatedPrice: quote.totalEstimate,
        statusLabel: null,
      };
    }

    const negotiation = mission.negotiation;
    if (!negotiation || negotiation.targetVendorId !== "vendor_c") {
      return {
        quoteId: quote.id,
        vendorId,
        name: quote.vendorName,
        phone: quote.phone,
        basicPrice: quote.totalEstimate,
        negotiatedPrice: null,
        statusLabel: "Not yet negotiated",
      };
    }

    if (negotiation.status === "in_progress") {
      return {
        quoteId: quote.id,
        vendorId,
        name: quote.vendorName,
        phone: quote.phone,
        basicPrice: negotiation.beforePrice,
        negotiatedPrice: null,
        statusLabel: "Negotiating…",
      };
    }

    if (negotiation.status === "failed") {
      return {
        quoteId: quote.id,
        vendorId,
        name: quote.vendorName,
        phone: quote.phone,
        basicPrice: negotiation.beforePrice,
        negotiatedPrice: null,
        statusLabel: "Negotiation could not be completed safely",
      };
    }

    return {
      quoteId: quote.id,
      vendorId,
      name: quote.vendorName,
      phone: quote.phone,
      basicPrice: negotiation.beforePrice,
      negotiatedPrice: negotiation.afterPrice ?? quote.totalEstimate,
      statusLabel: null,
    };
  });
}
