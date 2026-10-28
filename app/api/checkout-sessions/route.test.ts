import { beforeEach, describe, expect, it } from "vitest";
import { createCheckoutApi } from "@/lib/checkout/api";
import { CheckoutService } from "@/lib/checkout/service";
import { createStore } from "@/lib/checkout/store";
import type { CheckoutView } from "@/lib/checkout/types";

const origin = "http://localhost:3000";
let api: ReturnType<typeof createCheckoutApi>;

function jsonRequest(path: string, body: unknown, headers?: HeadersInit) {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function create(): Promise<{ response: Response; session: CheckoutView; token: string }> {
  const response = await api.createSession(
    jsonRequest("/api/checkout-sessions", {
      listingId: "knicks-celtics-101",
      surface: "web",
    }),
  );
  const session = (await response.json()) as CheckoutView;
  return { response, session, token: session.links.web.split("/").at(-1)! };
}

describe("checkout session API", () => {
  beforeEach(() => {
    api = createCheckoutApi(new CheckoutService(createStore()));
  });

  it("creates and resumes one session across surfaces", async () => {
    const { response, session, token } = await create();

    expect(response.status).toBe(201);
    expect(response.headers.get("location")).toBe(session.links.web);
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");

    const resumed = await api.resumeSession(
      new Request(`${origin}/api/checkout-sessions/${token}?surface=mobile`),
      token,
    );
    const mobileSession = (await resumed.json()) as CheckoutView;
    expect(mobileSession.id).toBe(session.id);
    expect(mobileSession.links.mobile).toContain(token);

    const analyticsResponse = await api.getAnalytics(token);
    const analytics = (await analyticsResponse.json()) as {
      events: Array<{ name: string; surface: string }>;
    };
    expect(analytics.events).toContainEqual(
      expect.objectContaining({ name: "SESSION_RESUMED", surface: "mobile" }),
    );
  });

  it("does not record background polls as fan resumes", async () => {
    const { token } = await create();
    await api.resumeSession(
      new Request(
        `${origin}/api/checkout-sessions/${token}?surface=mobile&poll=true`,
      ),
      token,
    );

    const response = await api.getAnalytics(token);
    const analytics = (await response.json()) as {
      events: Array<{ name: string }>;
    };
    expect(
      analytics.events.filter((event) => event.name === "SESSION_RESUMED"),
    ).toHaveLength(0);
  });

  it("returns a stable validation error envelope", async () => {
    const response = await api.createSession(
      jsonRequest("/api/checkout-sessions", { surface: "watch" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: { code: "INVALID_REQUEST", message: "listingId is required." },
    });
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  });

  it("requires exact price acceptance before completion", async () => {
    const { token } = await create();
    const changedResponse = await api.changePrice(
      jsonRequest(`/api/demo/checkout-sessions/${token}/price`, { delta: 15 }),
      token,
    );
    const changed = (await changedResponse.json()) as CheckoutView;

    const blocked = await api.completeSession(
      jsonRequest(
        `/api/checkout-sessions/${token}/complete`,
        { surface: "mobile" },
        { "Idempotency-Key": "mobile-attempt" },
      ),
      token,
    );
    expect(blocked.status).toBe(409);
    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: "PRICE_CONFIRMATION_REQUIRED" },
    });

    const acceptedResponse = await api.acceptPrice(
      jsonRequest(`/api/checkout-sessions/${token}/price-acceptance`, {
        priceVersion: changed.pendingPriceVersion,
        surface: "mobile",
      }),
      token,
    );
    const accepted = (await acceptedResponse.json()) as CheckoutView;
    expect(accepted.status).toBe("ACTIVE");
    expect(accepted.listing.total).toBe(398);
  });

  it("returns one order for concurrent completion requests", async () => {
    const { token } = await create();
    const complete = (surface: "web" | "mobile", key: string) =>
      api.completeSession(
        jsonRequest(
          `/api/checkout-sessions/${token}/complete`,
          { surface },
          { "Idempotency-Key": key },
        ),
        token,
      );

    const [webResponse, mobileResponse] = await Promise.all([
      complete("web", "web-attempt"),
      complete("mobile", "mobile-attempt"),
    ]);
    const web = (await webResponse.json()) as CheckoutView;
    const mobile = (await mobileResponse.json()) as CheckoutView;

    expect(web.status).toBe("COMPLETED");
    expect(mobile.orderId).toBe(web.orderId);
  });

  it("exposes an expired snapshot while rejecting later mutations", async () => {
    const { token } = await create();
    const expiredResponse = await api.expireSession(token);
    const expired = (await expiredResponse.json()) as CheckoutView;
    expect(expired.status).toBe("EXPIRED");

    const completion = await api.completeSession(
      jsonRequest(
        `/api/checkout-sessions/${token}/complete`,
        {},
        { "Idempotency-Key": "late-attempt" },
      ),
      token,
    );
    expect(completion.status).toBe(409);
    await expect(completion.json()).resolves.toMatchObject({
      error: { code: "SESSION_EXPIRED" },
    });
  });

  it("keeps the bearer token out of the analytics response", async () => {
    const { token } = await create();
    const response = await api.getAnalytics(token);
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain(token);
  });

  it("requires an idempotency key for completion", async () => {
    const { token } = await create();
    const response = await api.completeSession(
      jsonRequest(`/api/checkout-sessions/${token}/complete`, {}),
      token,
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_REQUEST" },
    });
  });
});
