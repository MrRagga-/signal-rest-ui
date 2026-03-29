import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ContactsRoute } from "@/routes/contacts-route";
import { makeProfile, makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

const accountNumber = "+4911111111";
const encodedAccountNumber = encodeURIComponent(accountNumber);

function renderContactsRoute() {
  const profile = makeProfile({
    id: "profile-1",
    baseUrl: "http://signal.test:8080",
    defaultAccountNumber: accountNumber,
  });

  return renderWithApp(<ContactsRoute />, {
    runtimeConfig: makeRuntimeConfig(profile),
    persistedState: {
      activeProfileId: profile.id,
      activeAccounts: {
        [profile.id]: accountNumber,
      },
    },
  });
}

describe("ContactsRoute", () => {
  it("saves a contact using the recipient field and shows success", async () => {
    let capturedPayload: unknown;

    server.use(
      http.get(`http://signal.test:8080/v1/contacts/${encodedAccountNumber}`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("all_recipients")).toBe("true");
        return HttpResponse.json([]);
      }),
      http.put(`http://signal.test:8080/v1/contacts/${encodedAccountNumber}`, async ({ request }) => {
        capturedPayload = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderContactsRoute();

    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Jane Example" },
    });
    fireEvent.change(screen.getByLabelText(/^recipient$/i), {
      target: { value: "+4922222222" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save contact/i }));

    await waitFor(() => {
      expect(screen.getByText(/contact saved/i)).toBeInTheDocument();
    });

    expect(capturedPayload).toEqual({
      name: "Jane Example",
      recipient: "+4922222222",
      expiration_in_seconds: undefined,
    });
  });

  it("surfaces sync failures to the operator", async () => {
    server.use(
      http.get(`http://signal.test:8080/v1/contacts/${encodedAccountNumber}`, () =>
        HttpResponse.json([]),
      ),
      http.post(`http://signal.test:8080/v1/contacts/${encodedAccountNumber}/sync`, () =>
        HttpResponse.json(
          { error: "Only the primary device can sync contacts." },
          { status: 400 },
        ),
      ),
    );

    renderContactsRoute();

    fireEvent.click(screen.getByRole("button", { name: /sync contacts/i }));

    await waitFor(() => {
      expect(screen.getByText(/contact sync failed/i)).toBeInTheDocument();
      expect(
        screen.getByText(/only the primary device can sync contacts/i),
      ).toBeInTheDocument();
    });
  });
});
