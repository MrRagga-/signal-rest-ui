import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { AdvancedRoute } from "@/routes/advanced-route";
import { makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

describe("AdvancedRoute", () => {
  it("loads trust mode without a GET body and updates it", async () => {
    let getRequestBody = "not-called";
    let postedPayload: unknown = null;

    server.use(
      http.get("http://signal.test:8080/v1/configuration", () =>
        HttpResponse.json({ logging: { Level: "info" } }),
      ),
      http.get("http://signal.test:8080/v1/configuration/:number/settings", async ({ request }) => {
        getRequestBody = await request.text();
        return HttpResponse.json({ trust_mode: "on-first-use" });
      }),
      http.post("http://signal.test:8080/v1/configuration/:number/settings", async ({ request }) => {
        postedPayload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithApp(<AdvancedRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("on-first-use")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/trust mode/i), {
      target: { value: "always" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply trust mode/i }));

    await waitFor(() => {
      expect(postedPayload).toEqual({ trust_mode: "always" });
    });

    expect(getRequestBody).toBe("");
  });
});
