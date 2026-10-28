# AI Usage

This project is being developed with an AI coding assistant as a collaborative implementation tool. The assistant helps inspect the repository, propose approaches, write code, run checks, and prepare reviewable changes. I remain responsible for product scope, architecture, review, and accepting or rejecting each change.

This is a living document. It will be updated when the collaboration materially affects how the system is designed or built.

## How I am using AI

I am not treating the initial prompt as a request for the assistant to generate the entire application without review. My workflow is:

1. Use the assistant to inspect the actual repository and the installed framework documentation.
2. Discuss product and technical tradeoffs before implementation.
3. Turn the agreed approach into small, ordered pull requests.
4. Stop after each PR-sized change and review the implementation.
5. Question decisions that are unclear or introduce unnecessary coupling.
6. Ask the assistant to revise the code, rerun verification, and document the result.

The goal is to use AI to shorten feedback loops while retaining normal engineering judgment and review discipline.

## Planning and scope decisions

Before implementation, I worked with the assistant to define the prototype and choose among meaningful alternatives. Decisions included:

- Demonstrate price changes and inventory expiration as the primary fan-facing recovery states.
- Model mobile as a responsive deep-link route that resumes the same backend session.
- Use an opaque bearer resume token because authentication is outside the prototype scope.
- Build a polished fan flow with a separate reviewer/debug surface.
- Include unit and end-to-end coverage rather than relying only on a manual demo.
- Break the work into small PRs for the domain model, API, web checkout, mobile continuity, and final observability/testing.

I specifically chose five smaller PRs so each architectural layer could be reviewed before the next one depended on it.

## Review and intervention examples

### Separating foundational changes

The initial branch mixed the generated Next.js scaffold with the checkout domain model. I asked the assistant to separate them into stacked PRs so the framework baseline and product logic could be reviewed independently. When the stacked PRs were merged in an order that left the domain commits off `main`, the assistant identified the history issue and prepared a promotion PR before continuing.

### Understanding the clock abstraction

I asked why the checkout service needed an injected clock instead of calling the system clock directly. The discussion established that checkout expiration is boundary-sensitive and that an injected clock makes tests deterministic without sleeping or mutating internal session state. I accepted the abstraction after understanding that production still uses the system clock.

### Removing an unnecessary type assertion

During API review, I challenged an `as number` assertion used after parsing `priceVersion`. The assistant explained that `Number.isInteger` does not narrow an `unknown` value in TypeScript. I requested a refactor to use explicit `typeof` narrowing, removing the assertion and making runtime validation and compile-time safety agree.

### Rejecting test-specific production code

I questioned `resetStoreForTests()` because it exposed a production function solely to manage test state. Rather than accepting the test hook, I asked for a dependency-injection refactor. The API boundary now has a `createCheckoutApi(service)` factory: production uses the shared service, while each test receives a fresh in-memory service and store.

### Keeping documentation current

I required the README to evolve with every PR rather than being written only at the end. It tracks what is currently implemented, how to run it, the state model, cross-surface behavior, failure handling, tradeoffs, and future production work.

### Choosing a UI library deliberately

Before starting the web checkout, I chose HeroUI v3 to reduce time spent building standard accessible controls and Lucide React for a consistent icon set. I asked for these dependencies to be isolated in their own PR so the library choices and package impact could be reviewed separately from page implementation. The assistant checked the current official installation guidance against the repository's React and Tailwind versions, confirmed that Lucide supports named tree-shakable React imports, then limited the change to the required packages, stylesheet setup, and documentation. This keeps the next UI diff focused on product behavior rather than dependency churn.

### Replacing hand-written server-state synchronization

While reviewing the web checkout, I asked whether TanStack Query was a better fit than custom effects for polling and API mutations. The assistant compared the added dependency against the upcoming mobile surface and identified that the first implementation was already recreating polling, loading, error, and invalidation behavior. I chose to adopt TanStack Query now so web and mobile can share a token-keyed server-state layer. We kept the server-rendered snapshot as initial data, disabled broad automatic retries, stopped polling in terminal states, and documented that the client cache never determines checkout validity.

### Making effects explicit

After the query refactor, I reviewed the remaining `useEffect` and confirmed that it existed only to synchronize a visible countdown with wall-clock time. I asked for that external synchronization to be extracted into a named `useCountdown` hook and added a repository rule to avoid effects for derived data, event handling, or API state. This keeps feature components declarative while still allowing effects when an external clock or browser API genuinely requires one.

### Applying the API boundary consistently

I noticed that session creation still used native `fetch` directly even after other checkout commands moved behind TanStack Query. I asked whether that inconsistency was justified. Although creation does not have an existing cache entry to update, I chose to model it as a query mutation so response parsing, typed errors, pending state, and retry policy remain centralized. The button now owns only user interaction and navigation to the returned resume token.

## What the assistant has contributed

The assistant has helped with:

- Repository and installed Next.js documentation inspection.
- Architecture and state-model proposals.
- TypeScript and Next.js implementation.
- Unit and API contract tests.
- Lint, type-check, and production-build verification.
- Git branch and stacked-PR preparation.
- README and API documentation.

These contributions are reviewed incrementally. Generated code is not assumed correct merely because tests pass; design clarity, production boundaries, and maintainability are part of the review.

## Current guardrails

- No PR-sized phase continues without a review pause.
- The backend remains authoritative for expiration, pricing, and completion.
- Test convenience should not leak into production interfaces without a product or operational reason.
- Type assertions should not replace runtime validation.
- Prototype shortcuts must be documented alongside the production alternative.
- Automated checks supplement, rather than replace, code review and scenario reasoning.
