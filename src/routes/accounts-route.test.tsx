import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AccountsRoute } from "@/routes/accounts-route";
import { makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

describe("AccountsRoute", () => {
  it("auto-selects the first discovered account", async () => {
    server.use(
      http.get("http://signal.test:8080/v1/accounts", () =>
        HttpResponse.json(["+4911111111", "+4922222222"]),
      ),
      http.get("http://signal.test:8080/v1/devices/:number", ({ params }) =>
        HttpResponse.json([{ id: 1, name: `Device for ${params.number as string}` }]),
      ),
    );

    renderWithApp(<AccountsRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Selected" })).toBeInTheDocument();
      expect(screen.getByText(/Device for \+4911111111/)).toBeInTheDocument();
    });
  });

  it("loads accounts and allows activating one", async () => {
    server.use(
      http.get("http://signal.test:8080/v1/accounts", () =>
        HttpResponse.json(["+4911111111", "+4922222222"]),
      ),
      http.get("http://signal.test:8080/v1/devices/:number", () =>
        HttpResponse.json([{ id: 1, name: "Desktop" }]),
      ),
    );

    renderWithApp(<AccountsRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    await waitFor(() => {
      expect(screen.getByText("+4922222222")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /use account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Selected/)).toBeInTheDocument();
    });
  });

  it("sets the username for the active account", async () => {
    let capturedPayload: unknown = null;

    server.use(
      http.get("http://signal.test:8080/v1/accounts", () =>
        HttpResponse.json(["+4911111111"]),
      ),
      http.get("http://signal.test:8080/v1/devices/:number", () =>
        HttpResponse.json([{ id: 1, name: "Desktop" }]),
      ),
      http.post("http://signal.test:8080/v1/accounts/:number/username", async ({ request }) => {
        capturedPayload = await request.json();
        return HttpResponse.json({ username: "operator-node" }, { status: 201 });
      }),
    );

    renderWithApp(<AccountsRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^username$/i), {
      target: { value: "operator-node" },
    });
    fireEvent.click(screen.getByRole("button", { name: /set username/i }));

    await waitFor(() => {
      expect(capturedPayload).toEqual({ username: "operator-node" });
    });
  });
});
