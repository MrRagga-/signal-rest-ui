import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ApiRoute } from "@/routes/api-route";
import { makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

describe("ApiRoute", () => {
  it("executes a request for a selected endpoint with path params", async () => {
    server.use(
      http.get("http://signal.test:8080/v1/contacts/:number/:uuid", ({ params }) =>
        HttpResponse.json({ ok: true, params }),
      ),
    );

    renderWithApp(<ApiRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    fireEvent.change(screen.getByPlaceholderText(/search by tag, path, or summary/i), {
      target: { value: "List Contact" },
    });

    fireEvent.click((await screen.findAllByRole("button", { name: /list contact/i }))[0]);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "+4911111111" } });
    fireEvent.change(inputs[2], { target: { value: "abc-uuid" } });
    fireEvent.click(screen.getByRole("button", { name: /run request/i }));

    await waitFor(() => {
      expect(screen.getByText(/abc-uuid/)).toBeInTheDocument();
    });
  });

  it("serializes array query parameters using repeated keys", async () => {
    let receivedNumbers: string[] = [];

    server.use(
      http.get("http://signal.test:8080/v1/search/:number", ({ request, params }) => {
        receivedNumbers = new URL(request.url).searchParams.getAll("numbers");
        return HttpResponse.json({ ok: true, params, receivedNumbers });
      }),
    );

    renderWithApp(<ApiRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    fireEvent.change(screen.getByPlaceholderText(/search by tag, path, or summary/i), {
      target: { value: "registered with the Signal Service" },
    });

    fireEvent.click(
      (await screen.findAllByRole("button", { name: /check if one or more phone numbers/i }))[0],
    );

    fireEvent.change(screen.getByLabelText(/^numbers$/i), {
      target: { value: "+49123456789, +49876543210" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run request/i }));

    await waitFor(() => {
      expect(receivedNumbers).toEqual(["+49123456789", "+49876543210"]);
    });
  });
});
