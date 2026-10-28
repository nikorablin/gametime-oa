import { beforeEach, describe, expect, it } from "vitest";
import { CheckoutService, type Clock } from "./service";
import { createStore, type CheckoutStore } from "./store";
import { CheckoutError } from "./types";

class FakeClock implements Clock {
  constructor(private value = new Date("2026-10-27T12:00:00.000Z")) {}

  now() {
    return new Date(this.value);
  }

  advance(milliseconds: number) {
    this.value = new Date(this.value.getTime() + milliseconds);
  }
}

describe("CheckoutService", () => {
  let store: CheckoutStore;
  let clock: FakeClock;
  let service: CheckoutService;
  const listingId = "knicks-celtics-101";

  beforeEach(() => {
    store = createStore();
    clock = new FakeClock();
    service = new CheckoutService(store, clock);
  });

  it("creates a ten-minute backend-owned hold", () => {
    const checkout = service.create(listingId, "web");

    expect(checkout.status).toBe("ACTIVE");
    expect(checkout.listing.total).toBe(368);
    expect(checkout.expiresAt).toBe("2026-10-27T12:10:00.000Z");
    expect(checkout.links.web).toMatch(/^\/checkout\/[A-Za-z0-9_-]{32}$/);
  });

  it("requires acceptance when the live price changes and preserves the hold deadline", () => {
    const created = service.create(listingId, "web");
    const token = created.links.web.split("/").at(-1)!;

    const changed = service.changePrice(token, 15);
    expect(changed.status).toBe("PRICE_CONFIRMATION_REQUIRED");
    expect(changed.listing.total).toBe(368);
    expect(changed.listing.pendingTotal).toBe(398);

    const accepted = service.acceptPrice(token, changed.pendingPriceVersion!, "mobile");
    expect(accepted.status).toBe("ACTIVE");
    expect(accepted.listing.total).toBe(398);
    expect(accepted.expiresAt).toBe(created.expiresAt);
  });

  it("rejects an acknowledgement after the price changes again", () => {
    const created = service.create(listingId);
    const token = created.links.web.split("/").at(-1)!;
    const firstChange = service.changePrice(token, 15);
    service.changePrice(token, 15);

    expect(() =>
      service.acceptPrice(token, firstChange.pendingPriceVersion!, "web"),
    ).toThrowError(expect.objectContaining({ code: "STALE_PRICE_VERSION" }));
  });

  it("expires exactly at the authoritative deadline and cannot be revived", () => {
    const created = service.create(listingId);
    const token = created.links.web.split("/").at(-1)!;
    clock.advance(10 * 60 * 1000);

    expect(service.resume(token).status).toBe("EXPIRED");
    expect(() => service.acceptPrice(token, 1, "web")).toThrowError(
      expect.objectContaining({ code: "SESSION_EXPIRED" }),
    );
  });

  it("blocks completion until the current price is accepted", async () => {
    const created = service.create(listingId);
    const token = created.links.web.split("/").at(-1)!;
    service.changePrice(token);

    await expect(service.complete(token, "attempt-1", "web")).rejects.toMatchObject({
      code: "PRICE_CONFIRMATION_REQUIRED",
    });
  });

  it("serializes concurrent completion and returns one order", async () => {
    const created = service.create(listingId);
    const token = created.links.web.split("/").at(-1)!;

    const [web, mobile] = await Promise.all([
      service.complete(token, "web-attempt", "web"),
      service.complete(token, "mobile-attempt", "mobile"),
    ]);

    expect(web.status).toBe("COMPLETED");
    expect(mobile.orderId).toBe(web.orderId);
    expect(
      service
        .analytics(token)
        .events.filter((event) => event.name === "ORDER_COMPLETED"),
    ).toHaveLength(1);
    expect(
      service
        .analytics(token)
        .events.some((event) => event.name === "DUPLICATE_COMPLETION_PREVENTED"),
    ).toBe(true);
  });

  it("does not expose the bearer token in analytics", () => {
    const created = service.create(listingId);
    const token = created.links.web.split("/").at(-1)!;

    expect(JSON.stringify(service.analytics(token))).not.toContain(token);
  });

  it("returns a typed not-found error for an invalid token", () => {
    expect(() => service.resume("not-a-session")).toThrowError(CheckoutError);
    expect(() => service.resume("not-a-session")).toThrowError(
      expect.objectContaining({ code: "SESSION_NOT_FOUND", status: 404 }),
    );
  });
});
