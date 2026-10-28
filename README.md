# Gametime Checkout Continuity

A proof-of-concept for carrying a time-sensitive ticket checkout across web and mobile without creating duplicate orders, accepting stale prices, or treating an expired hold like a normal saved cart.

This branch contains the checkout session domain model and its in-memory implementation. HTTP endpoints and fan-facing web/mobile surfaces will be added in subsequent PRs.

## Run locally

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and run the current test suite:

```bash
npm install
npm test
```

Other verification commands:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The generated Next.js starter can be run with `npm run dev`, but this branch does not expose the checkout model through the UI yet.

## What is built

- A backend-owned checkout session with a high-entropy resume token.
- A ten-minute inventory-hold deadline.
- Versioned price snapshots and explicit price acceptance.
- Terminal expiration and completion behavior.
- Serialized, idempotent completion so competing devices resolve to one order.
- In-memory analytics events for important checkout transitions.
- Deterministic unit tests using an injected clock.

The implementation is centered in `lib/checkout/service.ts`. The store and seeded listing are in `lib/checkout/store.ts`, and the public domain types are in `lib/checkout/types.ts`.

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

Creating a session produces web and mobile paths containing the same opaque resume token. Both surfaces will use that token to load the same backend session rather than copying checkout state between devices:

```text
/checkout/{resumeToken}
/m/checkout/{resumeToken}
```

The token is deliberately separate from the internal session ID. Analytics events use the internal ID so the bearer credential is not logged. The routes themselves are planned for a subsequent PR.

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
