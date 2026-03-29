import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { GroupsRoute } from "@/routes/groups-route";
import { makeProfile, makeRuntimeConfig, renderWithApp } from "@/test/render-app";
import { server } from "@/test/server";

const accountNumber = "+4911111111";
const encodedAccountNumber = encodeURIComponent(accountNumber);

function renderGroupsRoute() {
  const profile = makeProfile({
    id: "profile-1",
    baseUrl: "http://signal.test:8080",
    defaultAccountNumber: accountNumber,
  });

  return renderWithApp(<GroupsRoute />, {
    runtimeConfig: makeRuntimeConfig(profile),
    persistedState: {
      activeProfileId: profile.id,
      activeAccounts: {
        [profile.id]: accountNumber,
      },
    },
  });
}

describe("GroupsRoute", () => {
  it("updates the selected group metadata", async () => {
    let capturedPayload: unknown;

    server.use(
      http.get(`http://signal.test:8080/v1/groups/${encodedAccountNumber}`, () =>
        HttpResponse.json([
          {
            id: "group-1",
            name: "Ops Room",
            description: "Primary operations",
            members: ["+4911111111"],
            admins: ["+4911111111"],
            permissions: {
              add_members: "only-admins",
              edit_group: "only-admins",
              send_messages: "every-member",
            },
          },
        ]),
      ),
      http.put(
        `http://signal.test:8080/v1/groups/${encodedAccountNumber}/group-1`,
        async ({ request }) => {
          capturedPayload = await request.json();
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    renderGroupsRoute();

    await waitFor(() => {
      expect(screen.getByDisplayValue("Ops Room")).toBeInTheDocument();
    });

    fireEvent.change(screen.getAllByLabelText(/^name$/i)[0]!, {
      target: { value: "Ops Core" },
    });
    fireEvent.change(screen.getByLabelText(/group link setting/i), {
      target: { value: "enabled" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save group changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/group updated/i)).toBeInTheDocument();
    });

    expect(capturedPayload).toMatchObject({
      name: "Ops Core",
      description: "Primary operations",
      group_link: "enabled",
    });
  });

  it("creates a group with the extended management options", async () => {
    let capturedPayload: unknown;

    server.use(
      http.get(`http://signal.test:8080/v1/groups/${encodedAccountNumber}`, () =>
        HttpResponse.json([
          {
            id: "group-1",
            name: "Ops Room",
            members: ["+4911111111"],
            admins: ["+4911111111"],
          },
        ]),
      ),
      http.post(
        /^http:\/\/signal\.test:8080\/v1\/groups\/.+$/,
        async ({ request }) => {
          capturedPayload = await request.json();
          return HttpResponse.json({ id: "group-2" }, { status: 201 });
        },
      ),
    );

    const view = renderGroupsRoute();

    await waitFor(() => {
      expect(screen.getByText("Ops Room")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create group/i })).not.toBeDisabled();
    });

    fireEvent.change(view.container.querySelector("#createGroupName")!, {
      target: { value: "Launch Team" },
    });
    fireEvent.change(screen.getByLabelText(/seed members/i), {
      target: { value: "+4933333333, +4944444444" },
    });
    fireEvent.change(screen.getByLabelText(/group link$/i), {
      target: { value: "enabled" },
    });
    fireEvent.change(view.container.querySelector("#createEditGroupPermission")!, {
      target: { value: "every-member" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(capturedPayload).toBeDefined();
    });

    expect(capturedPayload).toMatchObject({
      name: "Launch Team",
      members: ["+4933333333", "+4944444444"],
      group_link: "enabled",
      permissions: {
        add_members: "only-admins",
        edit_group: "every-member",
        send_messages: "every-member",
      },
    });
  });
});
