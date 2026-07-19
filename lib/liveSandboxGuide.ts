import type { VendorId } from "./types";

export const LIVE_SANDBOX_VENDOR_ORDER: VendorId[] = [
  "vendor_a",
  "vendor_b",
  "vendor_c",
];

export const LIVE_SANDBOX_ROLEPLAY: Record<
  VendorId,
  { label: string; instruction: string }
> = {
  vendor_a: {
    label: "Vendor A",
    instruction:
      "Say the service call starts at $39, the technician decides labor and drilling on site, ETA is 20 minutes, and no ID is required. Do not confirm an all-in total.",
  },
  vendor_b: {
    label: "Vendor B",
    instruction:
      "Say $130 all-in: $40 dispatch plus $90 labor, 30-minute ETA, no-drill first, ID required, no other fees, and a 90-day warranty.",
  },
  vendor_c: {
    label: "Vendor C",
    instruction:
      "Say $165 all-in: $45 dispatch plus $120 labor, 15-minute ETA, non-destructive entry first, ID required, no other fees, and a one-year warranty.",
  },
};

export function liveSandboxVendorLabel(vendorId: VendorId): string {
  return LIVE_SANDBOX_ROLEPLAY[vendorId].label;
}
