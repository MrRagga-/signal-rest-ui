import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { ConnectionProfile } from "@/lib/types";
import { getProfilesFilePath, getRuntimeConfig, getServerPort } from "@server/config";
import { isLanSafeHost } from "@server/network";
import { ProfilesStore } from "@server/profiles-store";

const app = new Hono();
const runtimeConfig = getRuntimeConfig();
const port = getServerPort();
const profilesStore = new ProfilesStore(getProfilesFilePath(), runtimeConfig.defaultProfiles);

function isTransportMode(value: unknown): value is ConnectionProfile["transport"] {
  return value === "direct" || value === "proxy";
}

async function parseConnectionProfile(context: { req: { json: () => Promise<unknown> } }) {
  const payload = (await context.req.json()) as Record<string, unknown>;

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid connection target payload.");
  }

  const now = new Date().toISOString();

  return {
    id: typeof payload.id === "string" ? payload.id : undefined,
    label: typeof payload.label === "string" ? payload.label : "",
    baseUrl: typeof payload.baseUrl === "string" ? payload.baseUrl : "",
    transport: isTransportMode(payload.transport) ? payload.transport : "direct",
    authHeaderName:
      typeof payload.authHeaderName === "string" ? payload.authHeaderName : undefined,
    authToken: typeof payload.authToken === "string" ? payload.authToken : undefined,
    defaultAccountNumber:
      typeof payload.defaultAccountNumber === "string"
        ? payload.defaultAccountNumber
        : undefined,
    autoReceiveEnabled: Boolean(payload.autoReceiveEnabled),
    createdAt: typeof payload.createdAt === "string" ? payload.createdAt : now,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : now,
  } satisfies Partial<ConnectionProfile>;
}

function sanitizeProxyHeaders(headers: Headers) {
  [
    "host",
    "connection",
    "content-length",
    "accept-encoding",
    "x-target-base-url",
  ].forEach((name) => headers.delete(name));
  return headers;
}

function sanitizeResponseHeaders(headers: Headers) {
  ["content-encoding", "transfer-encoding", "connection"].forEach((name) =>
    headers.delete(name),
  );
  return headers;
}

function getProxyFailureMessage(target: URL, error: unknown) {
  const details =
    error instanceof Error && error.message ? ` ${error.message}` : "";
  return `Proxy request to ${target.origin} failed.${details}`;
}

app.get("/healthz", (context) =>
  context.json({
    status: "ok",
    proxyEnabled: runtimeConfig.proxy.enabled,
  }),
);

app.get("/config.json", async (context) =>
  context.json({
    ...runtimeConfig,
    defaultProfiles: await profilesStore.list(),
  }),
);

app.get("/ui-api/targets", async (context) =>
  context.json({
    profiles: await profilesStore.list(),
  }),
);

app.post("/ui-api/targets", async (context) => {
  try {
    const profile = await parseConnectionProfile(context);
    const savedProfile = await profilesStore.create(profile);
    return context.json(savedProfile, 201);
  } catch (error) {
    return context.json(
      {
        error: error instanceof Error ? error.message : "Unable to create connection target.",
      },
      400,
    );
  }
});

app.put("/ui-api/targets/:id", async (context) => {
  try {
    const profile = await parseConnectionProfile(context);
    const savedProfile = await profilesStore.update(context.req.param("id"), profile);
    return context.json(savedProfile);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update connection target.";
    return context.json(
      {
        error: message,
      },
      message.includes("does not exist") ? 404 : 400,
    );
  }
});

app.delete("/ui-api/targets/:id", async (context) => {
  const removed = await profilesStore.remove(context.req.param("id"));
  if (!removed) {
    return context.json(
      {
        error: "Connection target not found.",
      },
      404,
    );
  }

  return context.json({
    ok: true,
  });
});

app.all("/proxy/*", async (context) => {
  if (!runtimeConfig.proxy.enabled) {
    return context.json(
      {
        error: "Proxy mode is disabled for this container.",
      },
      404,
    );
  }

  const targetBaseUrl = context.req.header("x-target-base-url");
  if (!targetBaseUrl) {
    return context.json(
      {
        error: "Missing x-target-base-url header.",
      },
      400,
    );
  }

  let target: URL;
  try {
    target = new URL(targetBaseUrl);
  } catch {
    return context.json(
      {
        error: "Invalid target base URL.",
      },
      400,
    );
  }

  if (!isLanSafeHost(target.hostname, runtimeConfig.proxy.allowedHosts)) {
    return context.json(
      {
        error: `Proxy target ${target.hostname} is not allowed.`,
      },
      403,
    );
  }

  const requestUrl = new URL(context.req.url);
  const downstreamPath = requestUrl.pathname.replace(runtimeConfig.proxy.basePath, "") || "/";
  const downstreamUrl = new URL(`${downstreamPath}${requestUrl.search}`, target);
  const headers = sanitizeProxyHeaders(new Headers(context.req.raw.headers));
  const body =
    context.req.method === "GET" || context.req.method === "HEAD"
      ? undefined
      : await context.req.raw.arrayBuffer();

  let response: Response;
  try {
    response = await fetch(downstreamUrl, {
      method: context.req.method,
      headers,
      body,
    });
  } catch (error) {
    return context.json(
      {
        error: getProxyFailureMessage(target, error),
      },
      502,
    );
  }

  return new Response(response.body, {
    status: response.status,
    headers: sanitizeResponseHeaders(new Headers(response.headers)),
  });
});

app.use(
  "*",
  serveStatic({
    root: "./dist",
  }),
);

app.get("*", async (context) => {
  const requestedPath = new URL(context.req.url).pathname;
  if (extname(requestedPath)) {
    return context.notFound();
  }

  const html = await readFile(resolve(process.cwd(), "dist/index.html"), "utf8");
  return context.html(html);
});

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`signal-rest-ui server listening on http://localhost:${info.port}`);
  },
);

let shutdownStarted = false;

function shutdown(signal: NodeJS.Signals) {
  if (shutdownStarted) {
    process.exit(1);
  }

  shutdownStarted = true;
  console.log(`received ${signal}, shutting down signal-rest-ui server`);

  const forceExitTimer = setTimeout(() => {
    console.error("forced shutdown after timeout");
    process.exit(1);
  }, 10_000);

  server.close((error) => {
    clearTimeout(forceExitTimer);

    if (error) {
      console.error("error while shutting down server", error);
      process.exit(1);
    }

    process.exit(0);
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
