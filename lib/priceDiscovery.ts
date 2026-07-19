import type { LocksmithLead, LocksmithPriceResult, AgentSessionStatus } from "./types";

const MAX_AGENTS = 10;

/**
 * Simulates assigning each lead to one ElevenLabs agent slot and running
 * a Phase-1 quote-gathering session. Returns results sorted ascending by
 * basicPrice, with refused/no-answer entries at the bottom.
 *
 * Mock behaviour per session:
 *   10% — no answer (agent gets voicemail or disconnected)
 *   20% — vendor refuses to give a price
 *   70% — vendor quotes a price in the $80–$280 range
 */
export function mockRunPriceDiscovery(
  leads: LocksmithLead[],
  maxAgents = MAX_AGENTS,
): LocksmithPriceResult[] {
  const batch = leads.slice(0, maxAgents);

  const results: LocksmithPriceResult[] = batch.map((lead) => {
    const roll = Math.random();

    let status: AgentSessionStatus;
    let basicPrice: number | null = null;

    if (roll < 0.1) {
      status = "no_answer";
    } else if (roll < 0.3) {
      status = "refused";
    } else {
      status = "quoted";
      // Price range $80–$280, rounded to nearest $5
      basicPrice = Math.round((Math.random() * 200 + 80) / 5) * 5;
    }

    return {
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      basicPrice,
      status,
    };
  });

  return sortPriceResults(results);
}

function sortPriceResults(results: LocksmithPriceResult[]): LocksmithPriceResult[] {
  return [...results].sort((a, b) => {
    if (a.basicPrice !== null && b.basicPrice !== null) return a.basicPrice - b.basicPrice;
    if (a.basicPrice !== null) return -1;
    if (b.basicPrice !== null) return 1;
    // Both null — "refused" before "no_answer"
    if (a.status === "refused" && b.status === "no_answer") return -1;
    if (a.status === "no_answer" && b.status === "refused") return 1;
    return 0;
  });
}
