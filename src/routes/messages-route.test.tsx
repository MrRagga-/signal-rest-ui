import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { MessagesRoute } from "@/routes/messages-route";
import { makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

describe("MessagesRoute", () => {
  it("submits a send request for the active account", async () => {
    let payload: unknown = null;

    server.use(
      http.get("http://signal.test:8080/v1/contacts/:number", () =>
        HttpResponse.json([{ number: "+4922222222", name: "Jane" }]),
      ),
      http.post("http://signal.test:8080/v2/send", async ({ request }) => {
        payload = await request.json();
        return HttpResponse.json({ timestamp: "1234" }, { status: 201 });
      }),
    );

    renderWithApp(<MessagesRoute />, {
      runtimeConfig: makeRuntimeConfig(),
    });

    fireEvent.change(screen.getByLabelText(/recipients/i), {
      target: { value: "+4922222222" },
    });
    fireEvent.change(screen.getByLabelText(/^message$/i), {
      target: { value: "hello there" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/timestamp 1234/i)).toBeInTheDocument();
    });

    expect(payload).toMatchObject({
      number: "+4911111111",
      recipients: ["+4922222222"],
      message: "hello there",
    });
  });
});
