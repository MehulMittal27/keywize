import { NextRequest, NextResponse } from "next/server";
import { getMission, setMission } from "@/lib/store";
import { mockRunPriceDiscovery } from "@/lib/priceDiscovery";

/**
 * GET /api/missions/[id]/prices
 *
 * Returns price discovery results for a mission, sorted ascending by price.
 * If results haven't been computed yet (e.g. background locksmith search just
 * finished), runs the mock discovery now and caches it on the mission.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mission = getMission(id);

  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  // Return cached results if available
  if (mission.priceResults && mission.priceResults.length > 0) {
    return NextResponse.json({ priceResults: mission.priceResults });
  }

  // No leads yet — nothing to discover
  if (!mission.locksmithLeads || mission.locksmithLeads.length === 0) {
    return NextResponse.json({ priceResults: [] });
  }

  // Run mock discovery and cache on the mission
  const priceResults = mockRunPriceDiscovery(mission.locksmithLeads);
  mission.priceResults = priceResults;
  mission.callLog.push({
    timestamp: new Date().toISOString(),
    event: "price_discovery_complete",
    details: `${priceResults.filter((r) => r.basicPrice !== null).length} of ${priceResults.length} locksmiths quoted a price.`,
  });
  setMission(mission);

  return NextResponse.json({ priceResults });
}
