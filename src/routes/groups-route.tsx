import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RefreshCcw } from "lucide-react";
import { useAppState } from "@/app/app-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { JsonView } from "@/components/ui/json-view";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBanner } from "@/components/ui/status-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useGetV1GroupsNumberGroupid, useGetV1GroupsNumberGroupidAvatar } from "@/lib/api/generated/signal";
import {
  useAddGroupAdminsMutation,
  useAddGroupMembersMutation,
  useBlockGroupMutation,
  useCreateGroupMutation,
  useDeleteGroupMutation,
  useGroupsQuery,
  useJoinGroupMutation,
  useQuitGroupMutation,
  useRemoveGroupAdminsMutation,
  useRemoveGroupMembersMutation,
  useUpdateGroupMutation,
} from "@/lib/api/signal-hooks";
import { getErrorMessage } from "@/lib/api/client";
import type { GroupLinkMode, GroupPermissionMode } from "@/lib/types";
import { cn, splitCsv } from "@/lib/utils";
import { RequireActiveAccount } from "@/routes/route-helpers";

type EditableGroupLink = GroupLinkMode | "unchanged";
type EditablePermission = GroupPermissionMode | "unchanged";
type FeedbackState =
  | {
      variant: "success" | "error" | "info";
      title: string;
      message: string;
    }
  | null;

const groupLinkOptions: GroupLinkMode[] = [
  "disabled",
  "enabled",
  "enabled-with-approval",
];
const permissionOptions: GroupPermissionMode[] = ["only-admins", "every-member"];

export function GroupsRoute() {
  const { activeAccountNumber } = useAppState();
  const groupsQuery = useGroupsQuery();
  const createMutation = useCreateGroupMutation();
  const updateMutation = useUpdateGroupMutation();
  const deleteMutation = useDeleteGroupMutation();
  const addMembersMutation = useAddGroupMembersMutation();
  const removeMembersMutation = useRemoveGroupMembersMutation();
  const addAdminsMutation = useAddGroupAdminsMutation();
  const removeAdminsMutation = useRemoveGroupAdminsMutation();
  const blockMutation = useBlockGroupMutation();
  const joinMutation = useJoinGroupMutation();
  const quitMutation = useQuitGroupMutation();

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedGroupId, setSelectedGroupId] = useState<string>();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpirationTime, setEditExpirationTime] = useState("");
  const [editGroupLink, setEditGroupLink] = useState<EditableGroupLink>("unchanged");
  const [addMembersPermission, setAddMembersPermission] =
    useState<EditablePermission>("unchanged");
  const [editGroupPermission, setEditGroupPermission] =
    useState<EditablePermission>("unchanged");
  const [sendMessagesPermission, setSendMessagesPermission] =
    useState<EditablePermission>("unchanged");
  const [memberDraft, setMemberDraft] = useState("");
  const [adminDraft, setAdminDraft] = useState("");

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createMembers, setCreateMembers] = useState("");
  const [createExpirationTime, setCreateExpirationTime] = useState("");
  const [createGroupLink, setCreateGroupLink] = useState<GroupLinkMode>("disabled");
  const [createAddMembersPermission, setCreateAddMembersPermission] =
    useState<GroupPermissionMode>("only-admins");
  const [createEditGroupPermission, setCreateEditGroupPermission] =
    useState<GroupPermissionMode>("only-admins");
  const [createSendMessagesPermission, setCreateSendMessagesPermission] =
    useState<GroupPermissionMode>("every-member");

  const filteredGroups = useMemo(() => {
    const searchTerm = deferredSearch.toLowerCase();
    return (groupsQuery.data ?? []).filter((group) => {
      const haystack =
        `${group.name ?? ""} ${group.id ?? ""} ${(group.members ?? []).join(" ")} ${(group.admins ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [deferredSearch, groupsQuery.data]);

  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedGroupId(undefined);
      return;
    }

    if (!selectedGroupId || !filteredGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(filteredGroups[0]?.id);
    }
  }, [filteredGroups, selectedGroupId]);

  const selectedGroup = useMemo(
    () => (groupsQuery.data ?? []).find((group) => group.id === selectedGroupId),
    [groupsQuery.data, selectedGroupId],
  );
  const selectedGroupDetailQuery = useGetV1GroupsNumberGroupid(
    activeAccountNumber ?? "",
    selectedGroupId ?? "",
    {
      query: {
        enabled: Boolean(activeAccountNumber && selectedGroupId),
      },
    },
  );
  const selectedGroupAvatarQuery = useGetV1GroupsNumberGroupidAvatar(
    activeAccountNumber ?? "",
    selectedGroupId ?? "",
    {
      query: {
        enabled: Boolean(activeAccountNumber && selectedGroupId),
      },
    },
  );
  const selectedGroupSnapshot = useMemo(
    () => ({
      ...selectedGroup,
      ...(selectedGroupDetailQuery.data?.data ?? {}),
    }),
    [selectedGroup, selectedGroupDetailQuery.data?.data],
  );

  useEffect(() => {
    if (!selectedGroup) {
      setEditName("");
      setEditDescription("");
      setEditExpirationTime("");
      setEditGroupLink("unchanged");
      setAddMembersPermission("unchanged");
      setEditGroupPermission("unchanged");
      setSendMessagesPermission("unchanged");
      setMemberDraft("");
      setAdminDraft("");
      return;
    }

    setEditName(selectedGroup.name ?? "");
    setEditDescription(selectedGroup.description ?? "");
    setEditExpirationTime(
      typeof selectedGroup.expiration_time === "number"
        ? String(selectedGroup.expiration_time)
        : "",
    );
    setEditGroupLink("unchanged");
    setAddMembersPermission("unchanged");
    setEditGroupPermission("unchanged");
    setSendMessagesPermission("unchanged");
    setMemberDraft("");
    setAdminDraft("");
  }, [selectedGroup?.id]);

  const isActionBusy =
    groupsQuery.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    addMembersMutation.isPending ||
    removeMembersMutation.isPending ||
    addAdminsMutation.isPending ||
    removeAdminsMutation.isPending ||
    blockMutation.isPending ||
    joinMutation.isPending ||
    quitMutation.isPending;

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  };

  const runGroupAction = async (
    action: () => Promise<unknown>,
    successTitle: string,
    successMessage: string,
    errorTitle: string,
    onSuccess?: () => void,
  ) => {
    setFeedback(null);

    try {
      await action();
      onSuccess?.();
      setFeedback({
        variant: "success",
        title: successTitle,
        message: successMessage,
      });
    } catch (error) {
      setFeedback({
        variant: "error",
        title: errorTitle,
        message: getErrorMessage(error, `${errorTitle} failed.`),
      });
    }
  };

  const updateSelectedGroup = async () => {
    if (!selectedGroup?.id) {
      setFeedback({
        variant: "error",
        title: "No group selected",
        message: "Choose a group from the directory before editing its state.",
      });
      return;
    }

    if (!editName.trim()) {
      setFeedback({
        variant: "error",
        title: "Group name required",
        message: "Signal group updates need a non-empty name.",
      });
      return;
    }

    const expirationTime = parseOptionalNumber(editExpirationTime);
    if (Number.isNaN(expirationTime)) {
      setFeedback({
        variant: "error",
        title: "Invalid expiration timer",
        message: "Expiration time must be a whole number of seconds.",
      });
      return;
    }

    const permissions: {
      add_members?: GroupPermissionMode;
      edit_group?: GroupPermissionMode;
      send_messages?: GroupPermissionMode;
    } = {};

    if (addMembersPermission !== "unchanged") {
      permissions.add_members = addMembersPermission;
    }
    if (editGroupPermission !== "unchanged") {
      permissions.edit_group = editGroupPermission;
    }
    if (sendMessagesPermission !== "unchanged") {
      permissions.send_messages = sendMessagesPermission;
    }

    await runGroupAction(
      () =>
        updateMutation.mutateAsync({
          groupId: selectedGroup.id!,
          data: {
            name: editName.trim(),
            description: editDescription.trim(),
            expiration_time: expirationTime,
            group_link: editGroupLink === "unchanged" ? undefined : editGroupLink,
            permissions: Object.keys(permissions).length ? permissions : undefined,
          },
        }),
      "Group updated",
      `${editName.trim()} was updated successfully.`,
      "Could not update group",
    );
  };

  const createGroup = async () => {
    if (!createName.trim()) {
      setFeedback({
        variant: "error",
        title: "Group name required",
        message: "Provide a group name before creating the room.",
      });
      return;
    }

    const expirationTime = parseOptionalNumber(createExpirationTime);
    if (Number.isNaN(expirationTime)) {
      setFeedback({
        variant: "error",
        title: "Invalid expiration timer",
        message: "Expiration time must be a whole number of seconds.",
      });
      return;
    }

    await runGroupAction(
      async () => {
        const result = await createMutation.mutateAsync({
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          members: splitCsv(createMembers),
          expiration_time: expirationTime,
          group_link: createGroupLink,
          permissions: {
            add_members: createAddMembersPermission,
            edit_group: createEditGroupPermission,
            send_messages: createSendMessagesPermission,
          },
        });

        if (result.id) {
          setSelectedGroupId(result.id);
        }
      },
      "Group created",
      `${createName.trim()} was created and the group list is being refreshed.`,
      "Could not create group",
      () => {
        setCreateName("");
        setCreateDescription("");
        setCreateMembers("");
        setCreateExpirationTime("");
      },
    );
  };

  const applyMembersAction = async (
    mode: "add" | "remove",
    groupId: string,
    groupName: string,
  ) => {
    const members = splitCsv(memberDraft);
    if (!members.length) {
      setFeedback({
        variant: "error",
        title: "Member list required",
        message: "Provide one or more members as a comma-separated list.",
      });
      return;
    }

    await runGroupAction(
      () =>
        mode === "add"
          ? addMembersMutation.mutateAsync({ groupId, members })
          : removeMembersMutation.mutateAsync({ groupId, members }),
      mode === "add" ? "Members added" : "Members removed",
      `${members.length} member(s) were ${mode === "add" ? "added to" : "removed from"} ${groupName}.`,
      mode === "add" ? "Could not add members" : "Could not remove members",
      () => setMemberDraft(""),
    );
  };

  const applyAdminsAction = async (
    mode: "add" | "remove",
    groupId: string,
    groupName: string,
  ) => {
    const admins = splitCsv(adminDraft);
    if (!admins.length) {
      setFeedback({
        variant: "error",
        title: "Admin list required",
        message: "Provide one or more admins as a comma-separated list.",
      });
      return;
    }

    await runGroupAction(
      () =>
        mode === "add"
          ? addAdminsMutation.mutateAsync({ groupId, admins })
          : removeAdminsMutation.mutateAsync({ groupId, admins }),
      mode === "add" ? "Admins added" : "Admins removed",
      `${admins.length} admin(s) were ${mode === "add" ? "added to" : "removed from"} ${groupName}.`,
      mode === "add" ? "Could not add admins" : "Could not remove admins",
      () => setAdminDraft(""),
    );
  };

  const confirmDangerousAction = (message: string) =>
    typeof window === "undefined" || window.confirm(message);

  return (
    <RequireActiveAccount>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Group directory</CardTitle>
              <CardDescription>
                Search the active account’s groups, inspect their state, and pick one to manage in
                detail.
              </CardDescription>
            </div>
            {activeAccountNumber ? <Badge>{activeAccountNumber}</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                placeholder="Search by group name, id, member, or admin"
                value={search}
                onChange={(event) => startTransition(() => setSearch(event.target.value))}
              />
              <Button
                disabled={groupsQuery.isFetching}
                onClick={() => {
                  setFeedback(null);
                  groupsQuery.refetch();
                }}
                variant="secondary"
              >
                <RefreshCcw className="size-4" />
                Refresh
              </Button>
            </div>

            {groupsQuery.error ? (
              <StatusBanner title="Could not load groups" variant="error">
                {getErrorMessage(groupsQuery.error, "The group list request failed.")}
              </StatusBanner>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-400">
              <Badge>{filteredGroups.length} visible</Badge>
              <span>{groupsQuery.data?.length ?? 0} loaded</span>
              {groupsQuery.isFetching ? <span>Refreshing…</span> : null}
            </div>

            {groupsQuery.isPending ? (
              <EmptyState
                title="Loading groups"
                description="Fetching the expanded group list for the selected Signal account."
              />
            ) : filteredGroups.length ? (
              <div className="grid gap-3">
                {filteredGroups.map((group) => {
                  const isSelected = group.id === selectedGroup?.id;
                  const memberCount = Array.isArray(group.members) ? group.members.length : 0;
                  const pendingRequests = Array.isArray(group.pending_requests)
                    ? group.pending_requests.length
                    : 0;

                  return (
                    <button
                      key={group.id || group.name}
                      className={cn(
                        "rounded-[1.4rem] border p-4 text-left transition",
                        isSelected
                          ? "border-emerald-300/30 bg-emerald-400/10"
                          : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
                      )}
                      type="button"
                      onClick={() => {
                        setFeedback(null);
                        setSelectedGroupId(group.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{group.name || "Unnamed group"}</p>
                          <p className="mt-1 break-all text-sm text-stone-400">{group.id}</p>
                        </div>
                        <div className="shrink-0 flex flex-wrap justify-end gap-2">
                          <Badge>{memberCount} members</Badge>
                          {group.blocked ? <Badge>blocked</Badge> : null}
                          {pendingRequests ? <Badge>{pendingRequests} pending</Badge> : null}
                        </div>
                      </div>
                      {group.description ? (
                        <p className="mt-3 text-sm text-stone-400">{group.description}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No groups discovered"
                description="Create a new group below or broaden the search to another identifier."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Manage selected group</CardTitle>
                <CardDescription>
                  Edit metadata, adjust members and admins, and run explicit lifecycle actions on the
                  highlighted group.
                </CardDescription>
              </div>
              {selectedGroupSnapshot?.id ? (
                <Badge className="break-all text-[10px] tracking-[0.16em]">
                  {selectedGroupSnapshot.id}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              {selectedGroup ? (
                <Tabs defaultValue="overview">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="admins">Admins</TabsTrigger>
                    <TabsTrigger value="raw">Raw</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                            Group avatar
                          </p>
                          <JsonView
                            value={
                              selectedGroupAvatarQuery.data?.data ??
                              selectedGroupAvatarQuery.error ??
                              { status: "No avatar available for this group." }
                            }
                          />
                        </div>
                        <div>
                          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                            Direct group detail
                          </p>
                          <JsonView
                            value={
                              selectedGroupDetailQuery.data?.data ??
                              selectedGroupDetailQuery.error ??
                              { status: "Loading direct group payload…" }
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="editGroupName">Name</Label>
                            <Input
                              id="editGroupName"
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editExpirationTime">
                              Expiration time (seconds)
                            </Label>
                            <Input
                              id="editExpirationTime"
                              value={editExpirationTime}
                              onChange={(event) => setEditExpirationTime(event.target.value)}
                              placeholder="Leave blank to keep unchanged"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="editGroupDescription">Description</Label>
                          <Textarea
                            id="editGroupDescription"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                          />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="editGroupLink">Group link setting</Label>
                            <Select
                              id="editGroupLink"
                              value={editGroupLink}
                              onChange={(event) =>
                                setEditGroupLink(event.target.value as EditableGroupLink)
                              }
                            >
                              <option value="unchanged">Leave unchanged</option>
                              {groupLinkOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="currentInviteLink">Invite link</Label>
                            <Input
                              id="currentInviteLink"
                              readOnly
                              value={selectedGroupSnapshot.invite_link ?? "No invite link exposed"}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                          <PermissionSelect
                            id="editAddMembersPermission"
                            label="Who can add members"
                            value={addMembersPermission}
                            onChange={setAddMembersPermission}
                            currentValue={selectedGroupSnapshot.permissions?.add_members}
                          />
                          <PermissionSelect
                            id="editGroupPermission"
                            label="Who can edit group"
                            value={editGroupPermission}
                            onChange={setEditGroupPermission}
                            currentValue={selectedGroupSnapshot.permissions?.edit_group}
                          />
                          <PermissionSelect
                            id="sendMessagesPermission"
                            label="Who can send"
                            value={sendMessagesPermission}
                            onChange={setSendMessagesPermission}
                            currentValue={selectedGroupSnapshot.permissions?.send_messages}
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button disabled={isActionBusy} onClick={updateSelectedGroup}>
                            {updateMutation.isPending ? "Updating…" : "Save group changes"}
                          </Button>
                          <Button
                            disabled={isActionBusy}
                            onClick={() =>
                              runGroupAction(
                                () => joinMutation.mutateAsync(selectedGroup.id!),
                                "Join request sent",
                                `The account is joining ${selectedGroup.name || selectedGroup.id}.`,
                                "Could not join group",
                              )
                            }
                            variant="secondary"
                          >
                            Join group
                          </Button>
                          <Button
                            disabled={isActionBusy}
                            onClick={() => {
                              if (
                                !confirmDangerousAction(
                                  `Quit ${selectedGroup.name || selectedGroup.id}?`,
                                )
                              ) {
                                return;
                              }

                              runGroupAction(
                                () => quitMutation.mutateAsync(selectedGroup.id!),
                                "Group quit",
                                `The account left ${selectedGroup.name || selectedGroup.id}.`,
                                "Could not quit group",
                              );
                            }}
                            variant="secondary"
                          >
                            Quit group
                          </Button>
                          <Button
                            disabled={isActionBusy}
                            onClick={() => {
                              if (
                                !confirmDangerousAction(
                                  `Block ${selectedGroup.name || selectedGroup.id}?`,
                                )
                              ) {
                                return;
                              }

                              runGroupAction(
                                () => blockMutation.mutateAsync(selectedGroup.id!),
                                "Group blocked",
                                `${selectedGroup.name || selectedGroup.id} is now blocked.`,
                                "Could not block group",
                              );
                            }}
                            variant="danger"
                          >
                            Block group
                          </Button>
                          <Button
                            disabled={isActionBusy}
                            onClick={() => {
                              if (
                                !confirmDangerousAction(
                                  `Delete ${selectedGroup.name || selectedGroup.id}? This cannot be undone.`,
                                )
                              ) {
                                return;
                              }

                              runGroupAction(
                                () => deleteMutation.mutateAsync(selectedGroup.id!),
                                "Group deleted",
                                `${selectedGroup.name || selectedGroup.id} was deleted.`,
                                "Could not delete group",
                                () => setSelectedGroupId(undefined),
                              );
                            }}
                            variant="danger"
                          >
                            Delete group
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm text-stone-400">
                          <Badge>{selectedGroupSnapshot.members?.length ?? 0} members</Badge>
                          <Badge>{selectedGroupSnapshot.admins?.length ?? 0} admins</Badge>
                          {selectedGroupSnapshot.pending_invites?.length ? (
                            <Badge>
                              {selectedGroupSnapshot.pending_invites.length} pending invites
                            </Badge>
                          ) : null}
                          {selectedGroupSnapshot.pending_requests?.length ? (
                            <Badge>
                              {selectedGroupSnapshot.pending_requests.length} pending requests
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="members" className="space-y-4">
                    <StatusBanner title="Current members" variant="info">
                      {(selectedGroupSnapshot.members ?? []).length
                        ? (selectedGroupSnapshot.members ?? []).join(", ")
                        : "No expanded member list was returned for this group."}
                    </StatusBanner>
                    <div className="space-y-2">
                      <Label htmlFor="memberDraft">
                        Members to add or remove
                      </Label>
                      <Input
                        id="memberDraft"
                        value={memberDraft}
                        onChange={(event) => setMemberDraft(event.target.value)}
                        placeholder="+49123456789, +49123456788"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={isActionBusy}
                        onClick={() =>
                          applyMembersAction(
                            "add",
                            selectedGroup.id!,
                            selectedGroup.name || selectedGroup.id!,
                          )
                        }
                      >
                        Add members
                      </Button>
                      <Button
                        disabled={isActionBusy}
                        onClick={() =>
                          applyMembersAction(
                            "remove",
                            selectedGroup.id!,
                            selectedGroup.name || selectedGroup.id!,
                          )
                        }
                        variant="secondary"
                      >
                        Remove members
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="admins" className="space-y-4">
                    <StatusBanner title="Current admins" variant="info">
                      {(selectedGroupSnapshot.admins ?? []).length
                        ? (selectedGroupSnapshot.admins ?? []).join(", ")
                        : "No expanded admin list was returned for this group."}
                    </StatusBanner>
                    <div className="space-y-2">
                      <Label htmlFor="adminDraft">Admins to add or remove</Label>
                      <Input
                        id="adminDraft"
                        value={adminDraft}
                        onChange={(event) => setAdminDraft(event.target.value)}
                        placeholder="+49123456789, +49123456788"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={isActionBusy}
                        onClick={() =>
                          applyAdminsAction(
                            "add",
                            selectedGroup.id!,
                            selectedGroup.name || selectedGroup.id!,
                          )
                        }
                      >
                        Add admins
                      </Button>
                      <Button
                        disabled={isActionBusy}
                        onClick={() =>
                          applyAdminsAction(
                            "remove",
                            selectedGroup.id!,
                            selectedGroup.name || selectedGroup.id!,
                          )
                        }
                        variant="secondary"
                      >
                        Remove admins
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="raw">
                    <JsonView value={selectedGroupSnapshot} />
                  </TabsContent>
                </Tabs>
              ) : (
                <EmptyState
                  title="No group selected"
                  description="Pick a group from the directory or create a new one to start managing it."
                />
              )}

              {feedback ? (
                <div className="mt-4">
                  <StatusBanner title={feedback.title} variant={feedback.variant}>
                    {feedback.message}
                  </StatusBanner>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Create a group</CardTitle>
                <CardDescription>
                  Seed a new group with members, invite-link behavior, and baseline permissions from
                  the start.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="createGroupName">Name</Label>
                  <Input
                    id="createGroupName"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="createExpirationTime">Expiration time (seconds)</Label>
                  <Input
                    id="createExpirationTime"
                    value={createExpirationTime}
                    onChange={(event) => setCreateExpirationTime(event.target.value)}
                    placeholder="Optional disappearing timer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="createGroupDescription">Description</Label>
                <Textarea
                  id="createGroupDescription"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="createGroupMembers">Seed members</Label>
                <Input
                  id="createGroupMembers"
                  value={createMembers}
                  onChange={(event) => setCreateMembers(event.target.value)}
                  placeholder="+49123456789, +49123456788"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="createGroupLink">Group link</Label>
                  <Select
                    id="createGroupLink"
                    value={createGroupLink}
                    onChange={(event) =>
                      setCreateGroupLink(event.target.value as GroupLinkMode)
                    }
                  >
                    {groupLinkOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
                <PermissionSelect
                  id="createAddMembersPermission"
                  label="Who can add members"
                  value={createAddMembersPermission}
                  onChange={(value) =>
                    setCreateAddMembersPermission(value as GroupPermissionMode)
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PermissionSelect
                  id="createEditGroupPermission"
                  label="Who can edit group"
                  value={createEditGroupPermission}
                  onChange={(value) =>
                    setCreateEditGroupPermission(value as GroupPermissionMode)
                  }
                />
                <PermissionSelect
                  id="createSendMessagesPermission"
                  label="Who can send"
                  value={createSendMessagesPermission}
                  onChange={(value) =>
                    setCreateSendMessagesPermission(value as GroupPermissionMode)
                  }
                />
              </div>

              <Button disabled={isActionBusy} onClick={createGroup}>
                {createMutation.isPending ? "Creating…" : "Create group"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireActiveAccount>
  );
}

function PermissionSelect({
  id,
  label,
  value,
  onChange,
  currentValue,
}: {
  id: string;
  label: string;
  value: EditablePermission | GroupPermissionMode;
  onChange: (value: EditablePermission | GroupPermissionMode) => void;
  currentValue?: GroupPermissionMode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value as EditablePermission | GroupPermissionMode)
        }
      >
        {currentValue !== undefined ? (
          <option value="unchanged">
            Leave unchanged
            {currentValue ? ` (current: ${currentValue})` : ""}
          </option>
        ) : null}
        {permissionOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}
