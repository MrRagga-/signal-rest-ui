import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ConnectRoute } from "@/routes/connect-route";
import { makeProfile, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

describe("ConnectRoute", () => {
  it("tests and saves a LAN profile", async () => {
    const storedProfiles = new Map<string, Record<string, unknown>>();

    server.use(
      http.get("http://192.168.1.20:8080/v1/about", () =>
        HttpResponse.json({ version: "1.0", build: "test" }),
      ),
      http.post("/ui-api/targets", async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        storedProfiles.set(payload.id as string, payload);
        return HttpResponse.json(payload, { status: 201 });
      }),
    );

    renderWithApp(<ConnectRoute />, {
      runtimeConfig: {
        branding: { name: "Signal Rest UI", tagline: "tagline" },
        defaultProfiles: [],
        defaultTransport: "direct",
        proxy: { enabled: false, basePath: "/proxy", allowedHosts: [] },
        refreshIntervalMs: 15_000,
      },
    });

    fireEvent.change(screen.getByLabelText(/profile label/i), {
      target: { value: "Office Node" },
    });
    fireEvent.change(screen.getByLabelText(/base url/i), {
      target: { value: "http://192.168.1.20:8080" },
    });

    fireEvent.click(screen.getByRole("button", { name: /test and save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Office Node/)).toBeInTheDocument();
    });

    expect(storedProfiles.size).toBe(1);
    expect([...storedProfiles.values()][0]).toMatchObject({
      label: "Office Node",
      baseUrl: "http://192.168.1.20:8080",
      transport: "direct",
    });
  });

  it("falls back to proxy when direct browser access fails", async () => {
    const storedProfiles = new Map<string, Record<string, unknown>>();

    server.use(
      http.get("http://192.168.1.20:8080/v1/about", () => HttpResponse.error()),
      http.get(/^http:\/\/localhost(?::\d+)?\/proxy\/v1\/about$/, ({ request }) => {
        expect(request.headers.get("x-target-base-url")).toBe("http://192.168.1.20:8080");
        return HttpResponse.json({ version: "1.0", build: "proxy" });
      }),
      http.post("/ui-api/targets", async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        storedProfiles.set(payload.id as string, payload);
        return HttpResponse.json(payload, { status: 201 });
      }),
    );

    renderWithApp(<ConnectRoute />, {
      runtimeConfig: {
        branding: { name: "Signal Rest UI", tagline: "tagline" },
        defaultProfiles: [],
        defaultTransport: "direct",
        proxy: { enabled: true, basePath: "/proxy", allowedHosts: [] },
        refreshIntervalMs: 15_000,
      },
    });

    fireEvent.change(screen.getByLabelText(/profile label/i), {
      target: { value: "Office Node" },
    });
    fireEvent.change(screen.getByLabelText(/base url/i), {
      target: { value: "http://192.168.1.20:8080" },
    });

    fireEvent.click(screen.getByRole("button", { name: /test and save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/saved with proxy transport/i)).toBeInTheDocument();
      expect(screen.getByText(/Transport: proxy/i)).toBeInTheDocument();
    });

    expect([...storedProfiles.values()][0]).toMatchObject({
      transport: "proxy",
    });
  });

  it("edits an existing saved target in place", async () => {
    const savedProfile = makeProfile({
      id: "signal-lan",
      label: "Signal LAN",
      baseUrl: "http://192.168.1.20:8080",
    });
    const storedProfiles = new Map<string, Record<string, unknown>>([
      [savedProfile.id, savedProfile as unknown as Record<string, unknown>],
    ]);

    server.use(
      http.get("http://192.168.1.21:8080/v1/about", () =>
        HttpResponse.json({ version: "1.1", build: "edited" }),
      ),
      http.put("/ui-api/targets/:id", async ({ params, request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        storedProfiles.set(params.id as string, payload);
        return HttpResponse.json(payload);
      }),
    );

    renderWithApp(<ConnectRoute />, {
      runtimeConfig: {
        branding: { name: "Signal Rest UI", tagline: "tagline" },
        defaultProfiles: [savedProfile],
        defaultTransport: "proxy",
        proxy: { enabled: true, basePath: "/proxy", allowedHosts: [] },
        refreshIntervalMs: 15_000,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /edit signal lan/i }));

    expect(screen.getByDisplayValue("Signal LAN")).toBeInTheDocument();
    expect(screen.getByDisplayValue("http://192.168.1.20:8080")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/profile label/i), {
      target: { value: "Office Signal" },
    });
    fireEvent.change(screen.getByLabelText(/base url/i), {
      target: { value: "http://192.168.1.21:8080" },
    });
    fireEvent.click(screen.getByRole("button", { name: /test and save changes/i }));

    await waitFor(() => {
      expect(screen.getByText("Office Signal")).toBeInTheDocument();
    });

    expect(screen.queryByText("Signal LAN")).not.toBeInTheDocument();
    expect(screen.getByText("http://192.168.1.21:8080")).toBeInTheDocument();
    expect(storedProfiles.get(savedProfile.id)).toMatchObject({
      label: "Office Signal",
      baseUrl: "http://192.168.1.21:8080",
    });
  });

  it("deletes an existing shared target", async () => {
    const savedProfile = makeProfile({
      id: "signal-lan",
      label: "Signal LAN",
      baseUrl: "http://192.168.1.20:8080",
    });
    const storedProfiles = new Map<string, Record<string, unknown>>([
      [savedProfile.id, savedProfile as unknown as Record<string, unknown>],
    ]);

    server.use(
      http.delete("/ui-api/targets/:id", ({ params }) => {
        storedProfiles.delete(params.id as string);
        return HttpResponse.json({ ok: true });
      }),
    );

    renderWithApp(<ConnectRoute />, {
      runtimeConfig: {
        branding: { name: "Signal Rest UI", tagline: "tagline" },
        defaultProfiles: [savedProfile],
        defaultTransport: "direct",
        proxy: { enabled: false, basePath: "/proxy", allowedHosts: [] },
        refreshIntervalMs: 15_000,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /delete signal lan/i }));

    await waitFor(() => {
      expect(screen.queryByText("Signal LAN")).not.toBeInTheDocument();
    });

    expect(storedProfiles.has(savedProfile.id)).toBe(false);
  });

  it("saves an unverified target when connectivity fails", async () => {
    const storedProfiles = new Map<string, Record<string, unknown>>();

    server.use(
      http.post("/ui-api/targets", async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        storedProfiles.set(payload.id as string, payload);
        return HttpResponse.json(payload, { status: 201 });
      }),
    );

    renderWithApp(<ConnectRoute />, {
      runtimeConfig: {
        branding: { name: "Signal Rest UI", tagline: "tagline" },
        defaultProfiles: [],
        defaultTransport: "direct",
        proxy: { enabled: false, basePath: "/proxy", allowedHosts: [] },
        refreshIntervalMs: 15_000,
      },
    });

    fireEvent.change(screen.getByLabelText(/profile label/i), {
      target: { value: "Offline Node" },
    });
    fireEvent.change(screen.getByLabelText(/base url/i), {
      target: { value: "http://192.168.23.41:8080" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save unverified/i }));

    await waitFor(() => {
      expect(screen.getByText(/offline node/i)).toBeInTheDocument();
      expect(
        screen.getByText(/saved without connectivity verification/i),
      ).toBeInTheDocument();
    });

    expect([...storedProfiles.values()][0]).toMatchObject({
      label: "Offline Node",
      baseUrl: "http://192.168.23.41:8080",
      transport: "direct",
    });
  });

  it("persists the target when test-and-save fails connectivity", async () => {
    const storedProfiles = new Map<string, Record<string, unknown>>();

    server.use(
      http.get("http://192.168.23.41:8080/v1/about", () => HttpResponse.error()),
      http.post("/ui-api/targets", async ({ request }) => {
        const payload = (await request.json()) as Record<string, unknown>;
        storedProfiles.set(payload.id as string, payload);
        return HttpResponse.json(payload, { status: 201 });
      }),
    );

    renderWithApp(<ConnectRoute />, {
      runtimeConfig: {
        branding: { name: "Signal Rest UI", tagline: "tagline" },
        defaultProfiles: [],
        defaultTransport: "direct",
        proxy: { enabled: false, basePath: "/proxy", allowedHosts: [] },
        refreshIntervalMs: 15_000,
      },
    });

    fireEvent.change(screen.getByLabelText(/profile label/i), {
      target: { value: "Failing Node" },
    });
    fireEvent.change(screen.getByLabelText(/base url/i), {
      target: { value: "http://192.168.23.41:8080" },
    });

    fireEvent.click(screen.getByRole("button", { name: /test and save profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/failing node/i)).toBeInTheDocument();
      expect(
        screen.getByText(/target saved, but connectivity test failed/i),
      ).toBeInTheDocument();
      expect(screen.getByText("error")).toBeInTheDocument();
    });

    expect([...storedProfiles.values()][0]).toMatchObject({
      label: "Failing Node",
      baseUrl: "http://192.168.23.41:8080",
      transport: "direct",
    });
  });
});
