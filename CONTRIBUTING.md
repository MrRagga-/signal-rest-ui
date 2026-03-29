# Contributing

Thanks for contributing to Signal Rest UI.

## Before You Start

- Read [`README.md`](./README.md) for user-facing setup and runtime behavior.
- Read [`AGENTS.md`](./AGENTS.md) for repository-specific implementation rules.
- Search existing issues and pull requests before opening new work.

## Development Setup

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm test
pnpm lint
pnpm format
pnpm build
pnpm test:e2e
```

## Project Expectations

- Use `pnpm` for package and script commands.
- Keep transport-aware logic in `src/lib/api/client.ts` and `src/lib/api/runtime.ts`.
- Treat `src/lib/api/generated/` as generated output.
- Preserve the explicit receive model. Do not introduce automatic receive behavior casually.
- Keep proxying allowlist-based through `PROXY_ALLOWED_HOSTS`.
- Update docs when behavior, configuration, or container usage changes.

## API Changes

If the upstream Swagger changes:

```bash
pnpm prepare:openapi
pnpm generate:api
```

Do not hand-edit generated API files without also updating the generation inputs.

## Pull Requests

- Keep pull requests focused and reviewable.
- Add or update tests when behavior changes.
- Update `README.md`, `compose.yaml`, `Dockerfile`, and related docs together when runtime configuration changes.
- Use Conventional Commits for commit messages or, at minimum, for the PR title.

Examples:

```text
feat: add proxy target validation hint
fix: handle empty contact list response
docs: clarify docker compose defaults
```

## Reporting Bugs and Requesting Features

- Use GitHub Issues for reproducible bugs and feature requests.
- Use [`SUPPORT.md`](./SUPPORT.md) for general usage questions.
- Use [`SECURITY.md`](./SECURITY.md) for vulnerability reporting instructions.

## By Contributing

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in this project is licensed under the Apache License 2.0.
