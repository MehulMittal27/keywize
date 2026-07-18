import { NextResponse } from "next/server";
import { CASE_DEFINITIONS } from "@/lib/cases";

/**
 * GET /api/cases
 * Returns all supported lockout case definitions.
 */
export async function GET() {
  return NextResponse.json(CASE_DEFINITIONS);
}
