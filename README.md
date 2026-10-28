# Gametime Checkout Continuity

A proof-of-concept for carrying a time-sensitive ticket checkout across web and mobile without creating duplicate orders, accepting stale prices, or treating an expired hold like a normal saved cart.

This branch contains the checkout session domain model, HTTP API, event listing, server-rendered web checkout, and an app-like mobile deep-link surface backed by the same session.

See [AI_USAGE.md](./AI_USAGE.md) for how AI is being used as part of the planning, implementation, and review process.

## Run locally

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and run the current test suite:

```bash
npm install
npm test
```

Start the API locally:

```bash
npm run dev
```

The server is available at [http://localhost:3000](http://localhost:3000). Open the home page, choose the seeded listing, and continue to create a ten-minute checkout session.

To demonstrate continuity:

1. Start checkout on the web route.
2. Copy the mobile resume link and open it in a second window or narrow viewport.
3. Expand **Prototype controls** on either surface and raise the price or expire inventory.
4. Watch the other surface reconcile to the same state through background polling.
5. Complete on either surface; both converge on the same order.

Other verification commands:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## What is built

- A backend-owned checkout session with a high-entropy resume token.
- A ten-minute inventory-hold deadline.
- Versioned price snapshots and explicit price acceptance.
- Terminal expiration and completion behavior.
- Serialized, idempotent completion so competing devices resolve to one order.
- In-memory analytics events for important checkout transitions.
- JSON endpoints for creation, resume, price acceptance, and completion.
- Prototype-only endpoints for forcing price and expiration scenarios.
- A fan-facing event page and request-time server-rendered web checkout.
- A request-time `/m/checkout/{resumeToken}` route with an app-like mobile layout and sticky recovery actions.
- Collapsible prototype controls for simulating a price increase or inventory expiration.
- Explicit active, repricing, expired, completed, and invalid-link checkout views.
- An in-memory TanStack Query client cache for polling and mutations after hydration.
- Deterministic unit tests using an injected clock.
- Handler-level contract tests for validation, errors, caching, and cross-surface behavior.

The domain implementation is centered in `lib/checkout/service.ts`. Route Handlers under `app/api` are deliberately thin: they validate HTTP input and delegate state decisions to the service.

## UI foundation

The prototype uses HeroUI v3 as its component library and Lucide React for icons. This repository already met HeroUI's React 19 and Tailwind CSS 4 requirements, so setup consists of `@heroui/react`, `@heroui/styles`, and the HeroUI stylesheet imported after Tailwind in `app/globals.css`. HeroUI v3 does not require an application provider.

HeroUI was chosen to speed up construction of accessible, consistent checkout controls while leaving page composition and checkout-specific interaction design in the application. Lucide supplies a consistent SVG icon set and supports named, tree-shakable imports. UI code imports individual icons, treats decorative icons as hidden from assistive technology, and gives meaningful standalone icons accessible labels.

TanStack Query owns client-side server-state synchronization after hydration. The request-time Server Component still reads the checkout service directly and passes its snapshot as `initialData`, so event, seat, price, expiration, and recovery context are present in HTML before JavaScript runs. The query polls only while a session is actionable, and typed mutations centralize creation, price acceptance, and completion behavior. Creation navigates to the newly returned token without caching it under the selected listing.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/checkout-sessions` | Create a session for a listing. |
| `GET` | `/api/checkout-sessions/{resumeToken}?surface=web\|mobile` | Resume the authoritative session snapshot. |
| `POST` | `/api/checkout-sessions/{resumeToken}/price-acceptance` | Accept an exact pending price version. |
| `POST` | `/api/checkout-sessions/{resumeToken}/complete` | Complete once; requires an `Idempotency-Key` header. |
| `POST` | `/api/demo/checkout-sessions/{resumeToken}/price` | Prototype only: change the listing price. |
| `POST` | `/api/demo/checkout-sessions/{resumeToken}/expire` | Prototype only: expire the hold. |
| `GET` | `/api/demo/checkout-sessions/{resumeToken}/analytics` | Prototype only: inspect token-redacted events and summary counts. |

Create a session for the seeded listing:

```bash
curl --request POST http://localhost:3000/api/checkout-sessions \
  --header 'Content-Type: application/json' \
  --data '{"listingId":"knicks-celtics-101","surface":"web"}'
```

All responses use `Cache-Control: no-store`. Expected domain failures use a stable envelope:

```json
{
  "error": {
    "code": "PRICE_CONFIRMATION_REQUIRED",
    "message": "Accept the latest price before completing checkout."
  }
}
```

## Checkout session state model

```text
                         live price changes
ACTIVE ------------------------------------------------> PRICE_CONFIRMATION_REQUIRED
  |                                                               |
  | complete                                                      | accept exact price version
  v                                                               v
COMPLETED                                                       ACTIVE

ACTIVE -----------------------------> EXPIRED
PRICE_CONFIRMATION_REQUIRED ---------> EXPIRED
                 hold deadline reached
```

- `ACTIVE`: The hold is valid and the accepted price matches the current listing price.
- `PRICE_CONFIRMATION_REQUIRED`: The live price version changed. Completion is blocked until the fan accepts that exact version.
- `EXPIRED`: The inventory deadline has passed. This state is terminal.
- `COMPLETED`: One order was created. Later completion attempts return the same order.

The backend evaluates expiration and pricing on every read or mutation. Client countdowns will be presentational only.

## Cross-surface resume

Creating a session produces web and mobile paths containing the same opaque resume token. Both clients call the resume endpoint with that token and identify their surface; they never copy checkout state between devices:

```text
/checkout/{resumeToken}
/m/checkout/{resumeToken}
```

The token is deliberately separate from the internal session ID. Analytics events use the internal ID so the bearer credential is not logged. Web and mobile read the same token-keyed query and backend snapshot, while requests retain their `web` or `mobile` surface for instrumentation. Background polls are not counted as fan resumes.

## Stale inventory, price changes, and duplicate completion

### Stale inventory

The backend owns `expiresAt`. At the exact deadline, the session moves to `EXPIRED`; accepting a price or completing the session is then rejected. Reading an expired session still returns a renderable snapshot so a surface can explain what happened and offer recovery.

### Price changes

The session retains the last accepted unit price and price version. If the pricing stub reports another version, the session moves to `PRICE_CONFIRMATION_REQUIRED` and exposes both the quoted and pending totals. Acceptance must include the pending version, preventing a fan from unknowingly accepting a price that changed again. Accepting a new price does not extend the inventory hold.

### Duplicate completion

Completion is serialized per session. The first valid request creates an order and moves the session to `COMPLETED`. Concurrent or retried requests receive the existing order ID, even when they use different idempotency keys. Only one `ORDER_COMPLETED` event is emitted.

## Tradeoffs

- Sessions, listings, locks, orders, and analytics events live in process memory. They reset on restart and are not shared across server instances.
- The resume token acts as a scoped bearer credential because authentication is outside this prototype's scope.
- Inventory, pricing, payment, and analytics are represented by local behavior rather than external integrations.
- Expiration is reconciled lazily when a session is accessed; there is no background cleanup worker.
- The current lock is suitable only for one Node.js process.
- Route Handlers are public and the demo mutation endpoints have no production-grade authorization or environment gate.
- UI libraries add bundle and design-system coupling; checkout pages should use named HeroUI and Lucide imports and keep domain behavior outside presentation components.
- TanStack Query is an in-memory presentation cache, not checkout authority. It is not persisted, and every mutation is revalidated by the backend.
- The mobile experience is a responsive web simulation of an app deep link, not a native application or operating-system universal-link integration.
- No payment data or fan PII is stored.

These choices keep the state transitions easy to inspect while preserving boundaries that can be replaced later.

## With more time

- Store sessions and idempotency records in a transactional database or shared low-latency store.
- Use conditional writes or distributed locking to guarantee one order across server instances.
- Integrate an inventory provider that owns the actual hold and returns authoritative expiration.
- Integrate payment authorization with pending, webhook, failure, and reconciliation states.
- Protect resume links with authenticated fan access or short-lived signed capabilities.
- Deliver structured events to an analytics pipeline and trace continuity across devices.
- Add durable cleanup for expired sessions and retention policies for completed sessions.
- Add accessibility, browser, failure-injection, and end-to-end coverage for the web and mobile surfaces.
- Configure signed universal/app links and native lifecycle integration for a production mobile client.
