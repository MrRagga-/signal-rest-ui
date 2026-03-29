import { createBrowserRouter } from "react-router-dom";
import { RootShell } from "@/app/layout/root-shell";
import { AccountsRoute } from "@/routes/accounts-route";
import { AdvancedRoute } from "@/routes/advanced-route";
import { ApiRoute } from "@/routes/api-route";
import { AttachmentsRoute } from "@/routes/attachments-route";
import { ConnectRoute } from "@/routes/connect-route";
import { ContactsRoute } from "@/routes/contacts-route";
import { GroupsRoute } from "@/routes/groups-route";
import { MessagesRoute } from "@/routes/messages-route";
import { OverviewRoute } from "@/routes/overview-route";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootShell />,
    children: [
      {
        index: true,
        element: <OverviewRoute />,
      },
      {
        path: "connect",
        element: <ConnectRoute />,
      },
      {
        path: "accounts",
        element: <AccountsRoute />,
      },
      {
        path: "messages",
        element: <MessagesRoute />,
      },
      {
        path: "contacts",
        element: <ContactsRoute />,
      },
      {
        path: "groups",
        element: <GroupsRoute />,
      },
      {
        path: "attachments",
        element: <AttachmentsRoute />,
      },
      {
        path: "advanced",
        element: <AdvancedRoute />,
      },
      {
        path: "api",
        element: <ApiRoute />,
      },
    ],
  },
]);
