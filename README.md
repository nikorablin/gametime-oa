# Gametime Checkout Continuity

A proof of concept for resuming a time-sensitive ticket checkout across web and mobile without creating duplicate orders, accepting stale prices, or treating an expired hold like a saved cart.

See [AI_USAGE.md](./AI_USAGE.md) for a short explanation of how I used AI while building it.

## Demo video

https://github.com/user-attachments/assets/d4196350-8400-4abd-837d-8679f75dd300

## Run locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select the seeded listing, and start checkout.

For browser tests, install Chromium once:

```bash
npx playwright install chromium
npm test
npm run test:e2e
```

Additional checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit
```

## Demo flow

1. Start checkout on web.
2. Copy the mobile resume link and open it in another window or narrow viewport.
3. Use **Prototype controls** to raise the price or expire the inventory hold.
4. See both surfaces reconcile to the same backend state.
5. Complete on either surface; both resolve to the same order.
6. Expand **Reviewer tools** to inspect the token-redacted event timeline and summary metrics.

## Design

The backend owns the selected listing, accepted price version, inventory expiration, current state, completed order ID, idempotency, and analytics events. Clients only hold presentation state and a TanStack Query cache; they never decide whether a price, hold, or completion is valid.

Web and mobile resume the same backend session with one opaque token:

```text
/checkout/{resumeToken}
/m/checkout/{resumeToken}
```

The routes provide surface-specific layouts and recovery messages. The web route uses partial prerendering: event and seat context appears in the static shell, while authoritative price and expiration data streams at request time.

## State model

```text
ACTIVE ── price changes ──> PRICE_CONFIRMATION_REQUIRED
  │                                │
  │ complete                       │ accept exact version
  ▼                                ▼
COMPLETED                         ACTIVE

ACTIVE / PRICE_CONFIRMATION_REQUIRED ── hold expires ──> EXPIRED
```

- **ACTIVE:** The hold and accepted price are current.
- **PRICE_CONFIRMATION_REQUIRED:** Checkout is blocked until the fan accepts the latest exact price version.
- **EXPIRED:** The hold is invalid; the UI explains what happened and offers recovery.
- **COMPLETED:** One order exists; retries and competing devices receive that same order.

The backend reevaluates price and expiration on every read and mutation. Client countdowns are informational only.

## Important failure handling

- **Stale inventory:** `expiresAt` is backend-owned. Expiration is terminal, but the session remains readable for a useful recovery state.
- **Price changes:** The fan sees the previous and new totals. Acceptance includes the pending price version, so a second change cannot be accepted accidentally.
- **Duplicate completion:** Completion is serialized per session. Concurrent or retried requests return one order ID and emit one completion event.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/checkout-sessions` | Create a session. |
| `GET` | `/api/checkout-sessions/{token}?surface=web\|mobile` | Resume a session. |
| `POST` | `/api/checkout-sessions/{token}/price-acceptance` | Accept an exact price version. |
| `POST` | `/api/checkout-sessions/{token}/complete` | Complete idempotently. |
| `POST` | `/api/demo/checkout-sessions/{token}/price` | Demo a price change. |
| `POST` | `/api/demo/checkout-sessions/{token}/expire` | Demo expiration. |
| `GET` | `/api/demo/checkout-sessions/{token}/analytics` | Inspect demo analytics. |

All responses use `Cache-Control: no-store`. Route handlers validate HTTP input and delegate state transitions to `lib/checkout/service.ts`.

## Testing

- Vitest covers expiration boundaries, price acceptance, terminal states, and concurrent completion.
- API tests cover validation, cache headers, surface attribution, and token-redacted analytics.
- Playwright covers no-JavaScript shell content, web-to-mobile resume, repricing, expiration, concurrent completion, and invalid links.

## Tradeoffs

- Storage, locking, orders, and analytics are process-local and reset on restart.
- The resume token is a bearer credential because authentication is outside the prototype scope.
- Inventory, pricing, payment, and analytics providers are stubbed behind local interfaces.
- Expiration is reconciled on access rather than by a background worker.
- The mobile route simulates an app deep link; it is not a native app or universal-link integration.
- Demo mutation endpoints are visible and are not production-authorized.

These choices keep the state transitions easy to review while preserving boundaries that production services could replace.

## With more time

- Persist sessions and idempotency records in a transactional shared store.
- Use conditional writes or distributed locking across server instances.
- Integrate real inventory holds and payment authorization, including pending and webhook-driven outcomes.
- Protect resume links with authenticated access or short-lived signed capabilities.
- Send structured, token-free events to a durable analytics pipeline.
- Add native universal links, broader browser coverage, accessibility automation, and provider-failure scenarios.
