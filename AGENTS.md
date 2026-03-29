# AGENTS.md

This repository is a Vite + React 19 frontend with a small Hono server that serves the production build, publishes `/config.json`, and optionally proxies requests to `signal-cli-rest-api`.

Use this file as the repo-specific guide before making changes.

## Primary Goals

- Keep the app focused on high-frequency Signal operations.
- Preserve the direct-versus-proxy transport model.
- Keep generated API code reproducible from the vendored Swagger source.
- Avoid changes that make message receive more automatic or implicit than the current product intentionally allows.

## Stack

- Frontend: React 19, React Router 7, TanStack Query, React Hook Form, Zod
- Styling: Tailwind CSS v4 with local UI primitives in `src/components/ui`
- Server: Hono on Node via `@hono/node-server`
- Testing: Vitest, Testing Library, MSW, Playwright
- Codegen: `swagger2openapi` + Orval
- Package manager: `pnpm`

## Repository Map

- `src/app/`
  App shell, providers, global app state
- `src/routes/`
  Route-level screens; most user-visible behavior lives here
- `src/lib/api/`
  Runtime transport, request helpers, generated API client, app-specific hooks, Swagger endpoint catalog
- `src/components/ui/`
  Shared UI building blocks
- `server/`
  Production server, runtime config parsing, proxy policy
- `docs/swagger.json`
  Source Swagger document vendored into the repo
- `docs/swagger.openapi.json`
  Derived OpenAPI output used for generation
- `scripts/prepare-openapi.mjs`
  Swagger-to-OpenAPI conversion and path-parameter normalization
- `compose.yaml`
  Default local container orchestration for the UI image
- `.github/workflows/release-please.yml`
  Release PR, changelog, GitHub Release, Docker Hub + GHCR publishing, attestations, and SBOM asset generation
- `.github/workflows/docker-ci.yml`
  PR/manual Docker build validation only
- `.github/dependabot.yml`
  Weekly dependency updates for pnpm, Docker, and GitHub Actions
- `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`
  Public repository health and maintainer policy files
- `test/e2e/`
  Playwright coverage

## Working Rules

- Use `pnpm` for all package and script commands.
- Prefer `rg` for search and `pnpm` scripts for validation.
- Respect `.editorconfig` defaults for new or reformatted files.
- Treat `src/lib/api/generated/` as generated output. Do not hand-edit it unless the task is explicitly about generated output and you also update the generation inputs.
- The source of truth for API surface changes is `docs/swagger.json`, not `src/lib/api/generated/signal.ts`.
- Keep transport-aware request logic inside `src/lib/api/client.ts` and `src/lib/api/runtime.ts`. Do not duplicate proxy/direct URL logic in routes.
- Keep runtime env parsing in `server/config.ts` and client bootstrap behavior in `src/lib/runtime-config.ts` aligned.
- Keep `compose.yaml`, `Dockerfile`, and `README.md` aligned whenever runtime env vars or container startup behavior change.
- Keep release automation aligned across `release-please-config.json`, `.release-please-manifest.json`, `CHANGELOG.md`, and the GitHub workflows.
- Preserve local persistence behavior unless the task explicitly changes it. User profiles and auth tokens currently live in browser `localStorage`.

## Product Constraints

- `Connect` should continue testing `/v1/about` before treating a profile as healthy.
- When direct transport fails and proxy is enabled, connection test logic may fall back to proxy. Keep that behavior intentional and visible.
- The UI does not auto-schedule receive. Changes that make receive automatic need explicit justification because the product copy repeatedly warns about draining pending messages unexpectedly.
- Proxying must stay allowlist-based through `PROXY_ALLOWED_HOSTS`.
- Compose defaults should remain safe to boot locally without requiring secrets or a live upstream API.
- Release automation assumes Conventional Commits. Anything merged to `main` should use a releasable commit message or PR title.

## Implementation Conventions

- Use the `@/` alias for imports from `src`.
- Follow the route-per-screen structure already in `src/routes`.
- Prefer extending existing hooks in `src/lib/api/signal-hooks.ts` over issuing raw fetches from route components.
- Keep route guards in `src/routes/route-helpers.tsx` involved when a screen requires an active profile or account.
- Reuse local UI primitives in `src/components/ui` before introducing new one-off elements.
- Match the existing TypeScript style: explicit domain types in `src/lib/types.ts`, minimal indirection, and practical React state colocated with the screen that uses it.

## Generated API Workflow

If the upstream Swagger changes:

```bash
pnpm prepare:openapi
pnpm generate:api
```

Notes:

- `prepare:openapi` converts `docs/swagger.json` to `docs/swagger.openapi.json` and patches missing path parameters.
- Orval writes the generated client to `src/lib/api/generated/signal.ts` and schemas to `src/lib/api/generated/model/`.
- `src/lib/api/orval-mutator.ts` and `src/lib/api/client.ts` are the hand-written integration points around generated calls.

## Testing Expectations

After code changes, run the smallest relevant set and expand if the change touches shared behavior.

- UI logic and route changes: `pnpm test`
- Lint-sensitive edits: `pnpm lint`
- Formatting-sensitive edits: `pnpm format`
- End-to-end flow changes or navigation/workflow changes: `pnpm test:e2e`
- Build or server/runtime changes: `pnpm build`
- Docker or compose changes: `docker compose config`
- GitHub workflow edits: validate YAML syntax and, when relevant, confirm release/tag assumptions against `release-please`

If you skip a check, state that explicitly in the final handoff.

## Known Architecture Details

- `AppStateProvider` merges persisted profiles with `DEFAULT_PROFILES_JSON` and keeps the active profile/account in sync with `localStorage`.
- Runtime config is fetched from `/config.json` before the main app renders.
- Production serving happens through `server/index.ts`; Vite is only for development.
- The proxy endpoint is `/proxy/*` by default and requires `x-target-base-url`.
- The API console is backed by the vendored Swagger catalog in `src/lib/api/swagger.ts`.
- Official container publishing happens only from the release workflow after `release-please` creates a release.
- Official release images are expected in both Docker Hub and GHCR, with `org.opencontainers.image.source` pointing back to this repository.

## Safe Change Patterns

- For new Signal flows, prefer:
  1. extend Swagger/codegen inputs if needed,
  2. expose or wrap the request in `src/lib/api/signal-hooks.ts`,
  3. add route-level UI,
  4. cover the behavior with Vitest and, if it changes the main operator journey, Playwright.
- For config changes, update both server parsing and README examples.
- For container changes, update `Dockerfile`, `compose.yaml`, and README usage together.
- For release changes, update workflows, manifest/config files, and release documentation together.
- For docs changes, keep `README.md` user-facing and keep this file implementation-facing.

## Avoid

- Bypassing `apiRequest()` for normal Signal API traffic
- Hardcoding upstream hosts into UI logic
- Editing generated API files without regeneration
- Expanding background receive behavior casually
- Replacing route-level tests with only snapshot coverage
- Introducing non-Conventional-Commit release flow changes without updating the release automation
