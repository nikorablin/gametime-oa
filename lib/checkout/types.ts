export type Surface = "web" | "mobile" | "api";

export type CheckoutStatus =
  | "ACTIVE"
  | "PRICE_CONFIRMATION_REQUIRED"
  | "EXPIRED"
  | "COMPLETED";

export interface Listing {
  id: string;
  eventName: string;
  venue: string;
  eventDate: string;
  section: string;
  row: string;
  quantity: number;
  unitPrice: number;
  priceVersion: number;
}

export interface CheckoutSession {
  id: string;
  resumeToken: string;
  listingId: string;
  listingSnapshot: Omit<Listing, "unitPrice" | "priceVersion">;
  quotedUnitPrice: number;
  acceptedPriceVersion: number;
  pendingUnitPrice?: number;
  pendingPriceVersion?: number;
  status: CheckoutStatus;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  orderId?: string;
}

export type AnalyticsEventName =
  | "SESSION_CREATED"
  | "SESSION_RESUMED"
  | "PRICE_CHANGED"
  | "PRICE_CHANGE_SHOWN"
  | "PRICE_CHANGE_ACCEPTED"
  | "SESSION_EXPIRED"
  | "COMPLETION_ATTEMPTED"
  | "ORDER_COMPLETED"
  | "DUPLICATE_COMPLETION_PREVENTED";

export interface AnalyticsEvent {
  id: string;
  sessionId: string;
  name: AnalyticsEventName;
  surface: Surface | "system";
  at: string;
  details?: Record<string, string | number | boolean>;
}

export interface AnalyticsSnapshot {
  events: AnalyticsEvent[];
  summary: {
    sessionsCreated: number;
    completed: number;
    expired: number;
    crossSurface: number;
  };
}

export interface CheckoutView {
  id: string;
  listing: CheckoutSession["listingSnapshot"] & {
    quotedUnitPrice: number;
    pendingUnitPrice?: number;
    total: number;
    pendingTotal?: number;
  };
  status: CheckoutStatus;
  expiresAt: string;
  version: number;
  acceptedPriceVersion: number;
  pendingPriceVersion?: number;
  orderId?: string;
  links: { web: string; mobile: string };
}

export class CheckoutError extends Error {
  constructor(
    public code:
      | "SESSION_NOT_FOUND"
      | "SESSION_EXPIRED"
      | "PRICE_CONFIRMATION_REQUIRED"
      | "STALE_PRICE_VERSION"
      | "SESSION_COMPLETED"
      | "INVALID_REQUEST",
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
