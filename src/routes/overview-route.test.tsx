import { fireEvent, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { OverviewRoute } from "@/routes/overview-route";
import { makeProfile, makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

const accountNumber = "+4911111111";
const encodedAccountNumber = encodeURIComponent(accountNumber);

function renderOverviewRoute() {
  const profile = makeProfile({
    id: "profile-1",
    baseUrl: "http://signal.test:8080",
    defaultAccountNumber: accountNumber,
  });

  server.use(
    http.get("http://signal.test:8080/v1/about", () =>
      HttpResponse.json({ versions: ["v1", "v2"], build: 2, mode: "native" }),
    ),
    http.get("http://signal.test:8080/v1/configuration", () =>
      HttpResponse.json({ signalCli: "0.61", mode: "native" }),
    ),
    http.get("http://signal.test:8080/v1/accounts", () =>
      HttpResponse.json([accountNumber, "+4922222222"]),
    ),
    http.get(`http://signal.test:8080/v1/contacts/${encodedAccountNumber}`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("all_recipients")).toBe("true");
      return HttpResponse.json([
        { id: "contact-1", name: "Alice", recipient: "+4922222222" },
        { id: "contact-2", name: "Bob", recipient: "+4933333333" },
      ]);
    }),
    http.get(`http://signal.test:8080/v1/groups/${encodedAccountNumber}`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("expand")).toBe("true");
      return HttpResponse.json([
        { id: "group-1", name: "Ops", members: [] },
      ]);
    }),
    http.get("http://signal.test:8080/v1/attachments", () =>
      HttpResponse.json(["att-1", "att-2", "att-3"]),
    ),
  );

  return renderWithApp(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<OverviewRoute />} />
        <Route path="/accounts" element={<div>Accounts destination</div>} />
        <Route path="/contacts" element={<div>Contacts destination</div>} />
        <Route path="/groups" element={<div>Groups destination</div>} />
        <Route path="/attachments" element={<div>Attachments destination</div>} />
      </Routes>
    </MemoryRouter>,
    {
      runtimeConfig: makeRuntimeConfig(profile),
      persistedState: {
        activeProfileId: profile.id,
        activeAccounts: {
          [profile.id]: accountNumber,
        },
      },
    },
  );
}

describe("OverviewRoute", () => {
  it("renders summary cards as section links and navigates on click", async () => {
    renderOverviewRoute();

    expect(await screen.findByRole("link", { name: /accounts/i })).toHaveAttribute(
      "href",
      "/accounts",
    );
    expect(screen.getByRole("link", { name: /contacts/i })).toHaveAttribute(
      "href",
      "/contacts",
    );
    expect(screen.getByRole("link", { name: /groups/i })).toHaveAttribute("href", "/groups");
    expect(screen.getByRole("link", { name: /attachments/i })).toHaveAttribute(
      "href",
      "/attachments",
    );

    fireEvent.click(screen.getByRole("link", { name: /groups/i }));

    expect(await screen.findByText("Groups destination")).toBeInTheDocument();
  });
});
