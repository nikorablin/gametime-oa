import { expect, test, type APIRequestContext } from "@playwright/test";

interface SessionResponse {
  id: string;
  status: string;
  orderId?: string;
  links: { web: string; mobile: string };
}

async function createSession(request: APIRequestContext) {
  const response = await request.post("/api/checkout-sessions", {
    data: { listingId: "knicks-celtics-101", surface: "web" },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as SessionResponse;
}

test.describe.configure({ mode: "serial" });

test("renders useful checkout context without JavaScript", async ({ browser, request }) => {
  const session = await createSession(request);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(session.links.web);
  await expect(page.getByRole("heading", { name: "Loading current ticket hold…" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Boston Celtics at New York Knicks" }),
  ).toBeVisible();
  await expect(page.getByText("Section 115 · Row 12 · 2 tickets")).toBeVisible();
  await expect(page.getByLabel("Loading current price and expiration")).toBeVisible();

  await context.close();
});

test("resumes on mobile, reconciles a price change, and converges on one order", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(page).toHaveURL(/\/checkout\/[A-Za-z0-9_-]+$/);
  const token = new URL(page.url()).pathname.split("/").at(-1)!;

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  await mobile.goto(`/m/checkout/${token}`);
  await expect(mobile.getByText("Gametime app")).toBeVisible();
  await expect(mobile.getByText("Boston Celtics at New York Knicks")).toBeVisible();

  await page.getByText("Prototype controls").click();
  await page.getByRole("button", { name: "Raise price $15" }).click();
  await expect(mobile.getByText("Price update")).toBeVisible();
  await mobile.getByRole("button", { name: "Accept new price" }).click();

  await expect(page.getByText("Tickets reserved")).toBeVisible();
  await page.getByRole("button", { name: "Complete purchase" }).click();
  await expect(page.getByText("You are going to the game")).toBeVisible();
  const webConfirmation = await page.getByText(/Order GT-/).textContent();
  const orderId = webConfirmation?.match(/GT-[A-Z0-9]+/)?.[0];
  expect(orderId).toBeTruthy();

  await expect(mobile.getByText("Order confirmed")).toBeVisible();
  await expect(mobile.getByText(new RegExp(orderId!))).toBeVisible();

  await mobile.getByText("Prototype controls").click();
  await expect(mobile.getByText("Continuity signals")).toBeVisible();
  await expect(mobile.getByText("Cross-surface")).toBeVisible();
  await expect(mobile.getByRole("list", { name: "Checkout session event timeline" })).toContainText(
    "Order completed",
  );

  await mobileContext.close();
});

test("shows platform-appropriate expiration recovery on both surfaces", async ({
  browser,
  page,
  request,
}) => {
  const session = await createSession(request);
  await page.goto(session.links.web);
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileContext.newPage();
  await mobile.goto(session.links.mobile);

  await page.getByText("Prototype controls").click();
  await page.getByRole("button", { name: "Expire inventory" }).click();
  await expect(page.getByText("These tickets are no longer held")).toBeVisible();
  await expect(mobile.getByText("Hold expired")).toBeVisible();
  await expect(mobile.getByRole("link", { name: "Find new tickets" })).toBeVisible();

  await mobileContext.close();
});

test("concurrent completion requests return one order", async ({ request }) => {
  const session = await createSession(request);
  const token = session.links.web.split("/").at(-1)!;
  const complete = (surface: "web" | "mobile", key: string) =>
    request.post(`/api/checkout-sessions/${token}/complete`, {
      headers: { "Idempotency-Key": key },
      data: { surface },
    });

  const [webResponse, mobileResponse] = await Promise.all([
    complete("web", "e2e-web-attempt"),
    complete("mobile", "e2e-mobile-attempt"),
  ]);
  const web = (await webResponse.json()) as SessionResponse;
  const mobile = (await mobileResponse.json()) as SessionResponse;

  expect(webResponse.ok()).toBe(true);
  expect(mobileResponse.ok()).toBe(true);
  expect(web.orderId).toBeTruthy();
  expect(mobile.orderId).toBe(web.orderId);
});

test("renders safe recovery for invalid web and mobile links", async ({ page }) => {
  await page.goto("/checkout/not-a-session");
  await expect(page.getByRole("heading", { name: "Checkout link not found" })).toBeVisible();

  await page.goto("/m/checkout/not-a-session");
  await expect(page.getByRole("heading", { name: "Checkout link unavailable" })).toBeVisible();
});
