import { randomBytes, randomUUID } from "node:crypto";
import { getStore, type CheckoutStore } from "./store";
import {
  CheckoutError,
  type AnalyticsEvent,
  type AnalyticsSnapshot,
  type CheckoutSession,
  type CheckoutView,
  type Surface,
} from "./types";

const HOLD_MS = 10 * 60 * 1000;

export interface Clock {
  now(): Date;
}

const systemClock: Clock = { now: () => new Date() };

export class CheckoutService {
  constructor(
    private store: CheckoutStore = getStore(),
    private clock: Clock = systemClock,
  ) {}

  getListing() {
    const listing = this.store.listings.values().next().value;
    if (!listing) throw new CheckoutError("INVALID_REQUEST", "No listing is available.", 404);
    return { ...listing };
  }

  create(listingId: string, surface: Surface = "web"): CheckoutView {
    const listing = this.store.listings.get(listingId);
    if (!listing) {
      throw new CheckoutError("INVALID_REQUEST", "Unknown listing.", 400);
    }
    const now = this.clock.now();
    const token = randomBytes(24).toString("base64url");
    const session: CheckoutSession = {
      id: randomUUID(),
      resumeToken: token,
      listingId,
      listingSnapshot: {
        id: listing.id,
        eventName: listing.eventName,
        venue: listing.venue,
        eventDate: listing.eventDate,
        section: listing.section,
        row: listing.row,
        quantity: listing.quantity,
      },
      quotedUnitPrice: listing.unitPrice,
      acceptedPriceVersion: listing.priceVersion,
      status: "ACTIVE",
      expiresAt: new Date(now.getTime() + HOLD_MS).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
    };
    this.store.sessions.set(token, session);
    this.emit(session, "SESSION_CREATED", surface);
    return this.toView(session);
  }

  resume(token: string, surface: Surface = "api", recordResume = true): CheckoutView {
    const session = this.requireSession(token);
    this.reconcile(session);
    if (recordResume) {
      this.emit(session, "SESSION_RESUMED", surface);
      if (session.status === "PRICE_CONFIRMATION_REQUIRED") {
        this.emit(session, "PRICE_CHANGE_SHOWN", surface);
      }
    }
    return this.toView(session);
  }

  acceptPrice(token: string, expectedPriceVersion: number, surface: Surface): CheckoutView {
    const session = this.requireSession(token);
    this.reconcile(session);
    this.ensureMutable(session);
    if (
      session.status !== "PRICE_CONFIRMATION_REQUIRED" ||
      session.pendingPriceVersion !== expectedPriceVersion ||
      session.pendingUnitPrice === undefined
    ) {
      throw new CheckoutError(
        "STALE_PRICE_VERSION",
        "The price changed again. Review the latest price before continuing.",
      );
    }
    session.quotedUnitPrice = session.pendingUnitPrice;
    session.acceptedPriceVersion = session.pendingPriceVersion;
    delete session.pendingUnitPrice;
    delete session.pendingPriceVersion;
    session.status = "ACTIVE";
    this.touch(session);
    this.emit(session, "PRICE_CHANGE_ACCEPTED", surface, {
      priceVersion: expectedPriceVersion,
    });
    return this.toView(session);
  }

  async complete(token: string, idempotencyKey: string, surface: Surface): Promise<CheckoutView> {
    if (!idempotencyKey.trim()) {
      throw new CheckoutError("INVALID_REQUEST", "Idempotency-Key is required.", 400);
    }
    return this.withSessionLock(token, async () => {
      const session = this.requireSession(token);
      this.reconcile(session);
      this.emit(session, "COMPLETION_ATTEMPTED", surface);
      if (session.status === "COMPLETED") {
        this.emit(session, "DUPLICATE_COMPLETION_PREVENTED", surface);
        return this.toView(session);
      }
      this.ensureMutable(session);
      if (session.status === "PRICE_CONFIRMATION_REQUIRED") {
        throw new CheckoutError(
          "PRICE_CONFIRMATION_REQUIRED",
          "Accept the latest price before completing checkout.",
        );
      }
      const replayKey = `${session.id}:${idempotencyKey}`;
      const existingOrder = this.store.completionResponses.get(replayKey);
      if (existingOrder) {
        session.orderId = existingOrder;
        session.status = "COMPLETED";
        return this.toView(session);
      }
      const orderId = `GT-${randomUUID().slice(0, 8).toUpperCase()}`;
      session.orderId = orderId;
      session.status = "COMPLETED";
      this.touch(session);
      this.store.completionResponses.set(replayKey, orderId);
      this.emit(session, "ORDER_COMPLETED", surface, { orderId });
      return this.toView(session);
    });
  }

  changePrice(token: string, delta = 15): CheckoutView {
    const session = this.requireSession(token);
    const listing = this.store.listings.get(session.listingId)!;
    listing.unitPrice = Math.max(1, listing.unitPrice + delta);
    listing.priceVersion += 1;
    this.emit(session, "PRICE_CHANGED", "system", {
      unitPrice: listing.unitPrice,
      priceVersion: listing.priceVersion,
    });
    this.reconcile(session);
    return this.toView(session);
  }

  expire(token: string): CheckoutView {
    const session = this.requireSession(token);
    if (session.status !== "COMPLETED") {
      session.expiresAt = new Date(this.clock.now().getTime() - 1).toISOString();
      this.reconcile(session);
    }
    return this.toView(session);
  }

  analytics(token: string): AnalyticsSnapshot {
    const session = this.requireSession(token);
    const events = this.store.events.filter((event) => event.sessionId === session.id);
    const allSessions = [...this.store.sessions.values()];
    return {
      events,
      summary: {
        sessionsCreated: allSessions.length,
        completed: allSessions.filter((item) => item.status === "COMPLETED").length,
        expired: allSessions.filter((item) => item.status === "EXPIRED").length,
        crossSurface: allSessions.filter((item) => {
          const surfaces = new Set(
            this.store.events
              .filter((event) => event.sessionId === item.id && event.name === "SESSION_RESUMED")
              .map((event) => event.surface),
          );
          return surfaces.has("web") && surfaces.has("mobile");
        }).length,
      },
    };
  }

  private reconcile(session: CheckoutSession) {
    if (session.status === "COMPLETED" || session.status === "EXPIRED") return;
    if (this.clock.now().getTime() >= new Date(session.expiresAt).getTime()) {
      session.status = "EXPIRED";
      delete session.pendingUnitPrice;
      delete session.pendingPriceVersion;
      this.touch(session);
      this.emit(session, "SESSION_EXPIRED", "system");
      return;
    }
    const listing = this.store.listings.get(session.listingId);
    if (listing && listing.priceVersion !== session.acceptedPriceVersion) {
      session.status = "PRICE_CONFIRMATION_REQUIRED";
      session.pendingUnitPrice = listing.unitPrice;
      session.pendingPriceVersion = listing.priceVersion;
      this.touch(session);
    }
  }

  private ensureMutable(session: CheckoutSession) {
    if (session.status === "EXPIRED") {
      throw new CheckoutError("SESSION_EXPIRED", "This ticket hold has expired.");
    }
    if (session.status === "COMPLETED") {
      throw new CheckoutError("SESSION_COMPLETED", "This checkout is already complete.");
    }
  }

  private requireSession(token: string) {
    const session = this.store.sessions.get(token);
    if (!session) {
      throw new CheckoutError("SESSION_NOT_FOUND", "Checkout session not found.", 404);
    }
    return session;
  }

  private touch(session: CheckoutSession) {
    session.version += 1;
    session.updatedAt = this.clock.now().toISOString();
  }

  private emit(
    session: CheckoutSession,
    name: AnalyticsEvent["name"],
    surface: AnalyticsEvent["surface"],
    details?: AnalyticsEvent["details"],
  ) {
    this.store.events.push({
      id: randomUUID(),
      sessionId: session.id,
      name,
      surface,
      at: this.clock.now().toISOString(),
      details,
    });
  }

  private toView(session: CheckoutSession): CheckoutView {
    const quantity = session.listingSnapshot.quantity;
    return {
      id: session.id,
      listing: {
        ...session.listingSnapshot,
        quotedUnitPrice: session.quotedUnitPrice,
        pendingUnitPrice: session.pendingUnitPrice,
        total: session.quotedUnitPrice * quantity,
        pendingTotal:
          session.pendingUnitPrice === undefined
            ? undefined
            : session.pendingUnitPrice * quantity,
      },
      status: session.status,
      expiresAt: session.expiresAt,
      version: session.version,
      acceptedPriceVersion: session.acceptedPriceVersion,
      pendingPriceVersion: session.pendingPriceVersion,
      orderId: session.orderId,
      links: {
        web: `/checkout/${session.resumeToken}`,
        mobile: `/m/checkout/${session.resumeToken}`,
      },
    };
  }

  private async withSessionLock<T>(token: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.store.locks.get(token) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.store.locks.set(token, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.store.locks.get(token) === queued) this.store.locks.delete(token);
    }
  }
}

export const checkoutService = new CheckoutService();
