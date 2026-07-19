export type OfferStatus = "quoted" | "refused" | "no_answer";

export type MockLocksmithOffer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  basicPrice: number | null;
  status: OfferStatus;
};

const NAMES = [
  "Bay Area Lock & Key", "Golden Gate Locksmith", "SF Pro Locksmith",
  "Pacific Lock Solutions", "City Center Locksmith", "Rapid Key Services",
  "Sunset District Locks", "Castro Locksmith Co.", "Mission Lock Pros",
  "North Beach Lock & Safe",
];

const STREETS = [
  "Market St", "Mission St", "Valencia St", "Castro St", "Haight St",
  "Divisadero St", "Fillmore St", "Van Ness Ave", "Geary Blvd", "Irving St",
];

const BASE_PRICES = [80, 95, 110, 120, 130, 140, 150, 165, 180, 200];

const STATUSES: OfferStatus[] = [
  "quoted", "quoted", "quoted", "quoted", "quoted",
  "quoted", "quoted", "refused", "refused", "no_answer",
];

export function generateMockOffers(city: string, zip: string): MockLocksmithOffer[] {
  return NAMES.map((name, i) => ({
    id: `mock-offer-${i}`,
    name,
    phone: `+1 (415) 55${i}-${String(1000 + i * 137).slice(0, 4)}`,
    address: `${100 + i * 123} ${STREETS[i]}, ${city}, CA ${zip}`,
    basicPrice: STATUSES[i] === "quoted" ? BASE_PRICES[i] : null,
    status: STATUSES[i],
  }));
}

// Mock negotiation: knock ~13% off the basic price, rounded to the nearest $5.
export function negotiatedPrice(basicPrice: number): number {
  return Math.max(10, Math.round((basicPrice * 0.87) / 5) * 5);
}
