# Signal Rest UI

Signal Rest UI is a focused web UI for [`signal-cli-rest-api`](https://github.com/bbernhard/signal-cli-rest-api). It supports direct browser access when the upstream API is reachable from the client and a built-in proxy mode when it is not.

## Pull The Published Image

```bash
docker pull docker.io/mrragga/signal-rest-ui:latest
```

Run it with:

```bash
docker run --rm \
  -p 3000:3000 \
  -e PROXY_ENABLED=true \
  -e PROXY_ALLOWED_HOSTS=192.168.1.20,signal.local,host.docker.internal \
  docker.io/mrragga/signal-rest-ui:latest
```

Then open `http://localhost:3000`.

## What It Does

- Saves multiple Signal API connection profiles in the browser.
- Tests connectivity against `/v1/about` before saving a profile.
- Switches between direct browser access and same-container proxy transport.
- Registers numbers, verifies numbers, and links devices with a QR flow.
- Sends messages with attachments through `/v2/send`.
- Receives messages manually so draining pending messages stays explicit.
- Browses and edits contacts.
- Creates, updates, and manages groups.
- Searches and executes endpoints from the bundled Swagger catalog.

## Configuration

Common runtime environment variables:

```dotenv
PROXY_ENABLED=true
PROXY_ALLOWED_HOSTS=192.168.1.20,signal.local,host.docker.internal
DEFAULT_TRANSPORT=proxy
REFRESH_INTERVAL_MS=15000
```

Published release tags:

- `docker.io/mrragga/signal-rest-ui:latest`
- `docker.io/mrragga/signal-rest-ui:signal-rest-ui-vX.Y.Z`

Project source and full documentation:

- GitHub: [MrRagga-/signal-rest-ui](https://github.com/MrRagga-/signal-rest-ui)
- GHCR package: [ghcr.io/mrragga-/signal-rest-ui](https://github.com/MrRagga-/signal-rest-ui/pkgs/container/signal-rest-ui)
