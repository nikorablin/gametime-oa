# AI Usage

I used an AI coding assistant as a collaborative engineering tool, not as a one-shot application generator. It helped inspect the repository and framework documentation, propose implementations, write code and tests, run checks, and prepare pull requests. I remained responsible for scope, architecture, review, and accepting each change.

## My workflow

1. Plan the architecture and fan-facing scenarios before implementation.
2. Break the work into small PRs: scaffold, domain, API, web, mobile, and final testing/observability.
3. Review each PR before allowing the next layer to build on it.
4. Question unclear abstractions and request revisions when the implementation did not meet my standards.
5. Require tests, documentation, and verification alongside the code.

## Examples of engineering judgment

- I separated the generated Next.js scaffold from the checkout domain model so framework setup and business logic could be reviewed independently.
- I challenged the injected clock before accepting it; deterministic expiration-boundary tests justified the abstraction.
- I rejected an unnecessary TypeScript assertion and requested runtime narrowing instead.
- I removed a production `resetStoreForTests` hook in favor of dependency injection and isolated test services.
- I chose HeroUI and Lucide in a separate dependency PR, then adopted TanStack Query when shared web/mobile server-state synchronization justified it.
- I questioned the remaining `useEffect`, extracted clock synchronization into `useCountdown`, and documented the repository preference.
- I noticed session creation bypassed the shared query boundary and requested consistency.
- I used a failing no-JavaScript E2E test to improve the partial-prerender shell rather than weakening the performance assertion.
- I required dependency audit findings to be resolved even though they were limited to development tooling.

## Guardrails

- The backend remains authoritative for price, expiration, and completion.
- Test convenience does not leak into production interfaces.
- Type assertions do not replace runtime validation.
- Prototype shortcuts and production alternatives are documented.
- Passing tests supplements code review; it does not replace it.

This approach let AI shorten implementation and feedback loops while keeping design decisions and review responsibility with me.
