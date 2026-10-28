import type { AnalyticsEvent, CheckoutSession, Listing } from "./types";

export interface CheckoutStore {
  sessions: Map<string, CheckoutSession>;
  listings: Map<string, Listing>;
  events: AnalyticsEvent[];
  completionResponses: Map<string, string>;
  locks: Map<string, Promise<void>>;
}

const seedListing: Listing = {
  id: "knicks-celtics-101",
  eventName: "Boston Celtics at New York Knicks",
  venue: "Madison Square Garden",
  eventDate: "2027-01-16T19:30:00-05:00",
  section: "Section 115",
  row: "Row 12",
  quantity: 2,
  unitPrice: 184,
  priceVersion: 1,
};

declare global {
  var __checkoutContinuityStore: CheckoutStore | undefined;
}

export function createStore(): CheckoutStore {
  return {
    sessions: new Map(),
    listings: new Map([[seedListing.id, { ...seedListing }]]),
    events: [],
    completionResponses: new Map(),
    locks: new Map(),
  };
}

export function getStore(): CheckoutStore {
  globalThis.__checkoutContinuityStore ??= createStore();
  return globalThis.__checkoutContinuityStore;
}

export function getFeaturedListing() {
  return { ...(getStore().listings.get(seedListing.id) ?? seedListing) };
}
