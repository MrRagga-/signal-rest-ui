import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppState } from "@/app/app-state";
import type { ClientListDevicesResponse } from "@/lib/api/generated/model";
import { apiRequest, ApiError, testConnection } from "@/lib/api/client";
import type {
  AboutInfo,
  AttachmentRecord,
  ConnectionProfile,
  ContactRecord,
  GroupRecord,
  GroupLinkMode,
  GroupPermissionMode,
  ReceiveMessageRecord,
  SendMessagePayload,
} from "@/lib/types";
import { joinUrl } from "@/lib/utils";

function useProfileScope() {
  const state = useAppState();
  return {
    ...state,
    profileId: state.activeProfile?.id,
    accountNumber: state.activeAccountNumber,
  };
}

function requireAccountNumber(accountNumber?: string) {
  if (!accountNumber) {
    throw new ApiError("Select an active account first.");
  }

  return accountNumber;
}

export function useAboutQuery() {
  const { activeProfile } = useProfileScope();
  return useQuery({
    queryKey: ["about", activeProfile?.id],
    enabled: Boolean(activeProfile),
    queryFn: () => apiRequest<AboutInfo>("/v1/about", { profile: activeProfile }),
  });
}

export function useConfigurationQuery() {
  const { activeProfile } = useProfileScope();
  return useQuery({
    queryKey: ["configuration", activeProfile?.id],
    enabled: Boolean(activeProfile),
    queryFn: () => apiRequest<Record<string, unknown>>("/v1/configuration", { profile: activeProfile }),
  });
}

export function useAccountsQuery() {
  const { activeProfile, activeAccountNumber, setActiveAccount } = useProfileScope();
  const query = useQuery({
    queryKey: ["accounts", activeProfile?.id],
    enabled: Boolean(activeProfile),
    queryFn: () => apiRequest<string[]>("/v1/accounts", { profile: activeProfile }),
  });

  useEffect(() => {
    if (!activeProfile || activeAccountNumber || !query.data?.length) {
      return;
    }

    setActiveAccount(activeProfile.id, query.data[0]);
  }, [activeAccountNumber, activeProfile, query.data, setActiveAccount]);

  return query;
}

export function useContactsQuery(allRecipients = true) {
  const { activeProfile, accountNumber } = useProfileScope();
  return useQuery({
    queryKey: ["contacts", activeProfile?.id, accountNumber, allRecipients],
    enabled: Boolean(activeProfile && accountNumber),
    queryFn: () =>
      apiRequest<ContactRecord[]>(
        `/v1/contacts/${encodeURIComponent(accountNumber!)}` +
          (allRecipients ? "?all_recipients=true" : ""),
        { profile: activeProfile },
      ),
  });
}

export function useGroupsQuery(expand = true) {
  const { activeProfile, accountNumber } = useProfileScope();
  return useQuery({
    queryKey: ["groups", activeProfile?.id, accountNumber, expand],
    enabled: Boolean(activeProfile && accountNumber),
    queryFn: () =>
      apiRequest<GroupRecord[]>(
        `/v1/groups/${encodeURIComponent(accountNumber!)}?expand=${expand}`,
        { profile: activeProfile },
      ),
  });
}

export function useDevicesQuery() {
  const { activeProfile, accountNumber } = useProfileScope();
  return useQuery({
    queryKey: ["devices", activeProfile?.id, accountNumber],
    enabled: Boolean(activeProfile && accountNumber),
    queryFn: () =>
      apiRequest<ClientListDevicesResponse[]>(
        `/v1/devices/${encodeURIComponent(accountNumber!)}`,
        { profile: activeProfile },
      ),
  });
}

export function useAttachmentsQuery() {
  const { activeProfile } = useProfileScope();
  return useQuery({
    queryKey: ["attachments", activeProfile?.id],
    enabled: Boolean(activeProfile),
    queryFn: async () => {
      const attachmentIds = await apiRequest<string[]>("/v1/attachments", {
        profile: activeProfile,
      });
      return attachmentIds.map((attachment) => ({
        id: attachment,
        attachment,
        name: attachment,
      })) satisfies AttachmentRecord[];
    },
  });
}

export function useConnectionTestMutation() {
  return useMutation({
    mutationFn: (profile: ConnectionProfile) => testConnection(profile),
  });
}

export function useRegisterNumberMutation() {
  const { activeProfile } = useProfileScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      number,
      captcha,
      useVoice,
    }: {
      number: string;
      captcha?: string;
      useVoice?: boolean;
    }) =>
      apiRequest(`/v1/register/${encodeURIComponent(number)}`, {
        method: "POST",
        profile: activeProfile,
        body: {
          captcha: captcha || undefined,
          use_voice: useVoice || undefined,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useVerifyNumberMutation() {
  const { activeProfile } = useProfileScope();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      number,
      token,
      pin,
    }: {
      number: string;
      token: string;
      pin?: string;
    }) =>
      apiRequest(`/v1/register/${encodeURIComponent(number)}/verify/${encodeURIComponent(token)}`, {
        method: "POST",
        profile: activeProfile,
        body: pin ? { pin } : {},
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useRawQrLinkMutation() {
  const { activeProfile } = useProfileScope();
  return useMutation({
    mutationFn: ({ deviceName }: { deviceName: string }) =>
      apiRequest<{ device_link_uri?: string }>(
        `/v1/qrcodelink/raw?device_name=${encodeURIComponent(deviceName)}`,
        {
          method: "GET",
          profile: activeProfile,
        },
      ),
  });
}

export function buildQrImageUrl(profile: ConnectionProfile | undefined, deviceName: string) {
  if (!profile || profile.transport !== "direct" || profile.authToken) {
    return null;
  }
  return joinUrl(
    profile.baseUrl,
    `/v1/qrcodelink?device_name=${encodeURIComponent(deviceName)}&qrcode_version=10`,
  );
}

export function useSendMessageMutation() {
  const { activeProfile } = useProfileScope();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      apiRequest<{ timestamp?: string }>("/v2/send", {
        method: "POST",
        profile: activeProfile,
        body: payload as unknown as Record<string, unknown>,
      }),
  });
}

export function useReceiveMessagesMutation() {
  const { activeProfile, accountNumber, markProfileSynced } = useProfileScope();
  return useMutation({
    mutationFn: (options?: {
      timeout?: number;
      ignoreAttachments?: boolean;
      maxMessages?: number;
      sendReadReceipts?: boolean;
    }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);

      const search = new URLSearchParams();
      if (options?.timeout) {
        search.set("timeout", String(options.timeout));
      }
      if (options?.ignoreAttachments) {
        search.set("ignore_attachments", "true");
      }
      if (options?.maxMessages) {
        search.set("max_messages", String(options.maxMessages));
      }
      if (options?.sendReadReceipts) {
        search.set("send_read_receipts", "true");
      }
      const query = search.toString();
      return apiRequest<ReceiveMessageRecord[]>(
        `/v1/receive/${encodeURIComponent(selectedAccountNumber)}${query ? `?${query}` : ""}`,
        {
          method: "GET",
          profile: activeProfile,
        },
      );
    },
    onSuccess: () => {
      if (activeProfile) {
        markProfileSynced(activeProfile.id);
      }
    },
  });
}

export function useCreateGroupMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      members: string[];
      expiration_time?: number;
      group_link?: GroupLinkMode;
      permissions?: {
        add_members?: GroupPermissionMode;
        edit_group?: GroupPermissionMode;
        send_messages?: GroupPermissionMode;
      };
    }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest<{ id?: string }>(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}`, {
        method: "POST",
        profile: activeProfile,
        body: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateContactMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      recipient,
      expirationInSeconds,
    }: {
      name: string;
      recipient: string;
      expirationInSeconds?: number;
    }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/contacts/${encodeURIComponent(selectedAccountNumber)}`, {
        method: "PUT",
        profile: activeProfile,
        body: {
          name,
          recipient,
          expiration_in_seconds: expirationInSeconds,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useSyncContactsMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/contacts/${encodeURIComponent(selectedAccountNumber)}/sync`, {
        method: "POST",
        profile: activeProfile,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateGroupMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      data,
    }: {
      groupId: string;
      data: {
        name?: string;
        description?: string;
        expiration_time?: number;
        group_link?: GroupLinkMode;
        permissions?: {
          add_members?: GroupPermissionMode;
          edit_group?: GroupPermissionMode;
          send_messages?: GroupPermissionMode;
        };
      };
    }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}`, {
        method: "PUT",
        profile: activeProfile,
        body: data,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteGroupMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}`, {
        method: "DELETE",
        profile: activeProfile,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useAddGroupMembersMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, members }: { groupId: string; members: string[] }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/members`, {
        method: "POST",
        profile: activeProfile,
        body: { members },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveGroupMembersMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, members }: { groupId: string; members: string[] }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/members`, {
        method: "DELETE",
        profile: activeProfile,
        body: { members },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useAddGroupAdminsMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, admins }: { groupId: string; admins: string[] }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/admins`, {
        method: "POST",
        profile: activeProfile,
        body: { admins },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveGroupAdminsMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, admins }: { groupId: string; admins: string[] }) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/admins`, {
        method: "DELETE",
        profile: activeProfile,
        body: { admins },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useBlockGroupMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/block`, {
        method: "POST",
        profile: activeProfile,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useJoinGroupMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/join`, {
        method: "POST",
        profile: activeProfile,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useQuitGroupMutation() {
  const { activeProfile, accountNumber } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => {
      const selectedAccountNumber = requireAccountNumber(accountNumber);
      return apiRequest(`/v1/groups/${encodeURIComponent(selectedAccountNumber)}/${encodeURIComponent(groupId)}/quit`, {
        method: "POST",
        profile: activeProfile,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useDeleteAttachmentMutation() {
  const { activeProfile } = useProfileScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      apiRequest(`/v1/attachments/${encodeURIComponent(attachmentId)}`, {
        method: "DELETE",
        profile: activeProfile,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["attachments"] });
    },
  });
}

export function useAttachmentPreviewMutation() {
  const { activeProfile } = useProfileScope();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      apiRequest<Blob>(`/v1/attachments/${encodeURIComponent(attachmentId)}`, {
        method: "GET",
        profile: activeProfile,
      }),
  });
}

export function useApiConsoleMutation() {
  const { activeProfile } = useProfileScope();
  return useMutation({
    mutationFn: ({
      path,
      method,
      query,
      body,
    }: {
      path: string;
      method: string;
      query?: Record<string, string | string[] | boolean>;
      body?: unknown;
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(query ?? {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((entry) => searchParams.append(key, entry));
          return;
        }
        searchParams.set(key, String(value));
      });
      const search = searchParams.toString();
      return apiRequest<unknown>(`${path}${search ? `?${search}` : ""}`, {
        method,
        profile: activeProfile,
        body: body as Record<string, unknown> | undefined,
      });
    },
  });
}
