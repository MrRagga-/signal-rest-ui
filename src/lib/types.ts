export type TransportMode = "direct" | "proxy";

export interface ConnectionProfile {
  id: string;
  label: string;
  baseUrl: string;
  transport: TransportMode;
  authHeaderName?: string;
  authToken?: string;
  defaultAccountNumber?: string;
  autoReceiveEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  lastConnectionStatus?: "idle" | "ok" | "error";
  lastConnectionError?: string;
  lastSuccessfulSyncAt?: string;
}

export interface ActiveAccountRef {
  profileId: string;
  accountNumber: string;
}

export interface RuntimeConfig {
  branding: {
    name: string;
    tagline: string;
  };
  defaultProfiles: ConnectionProfile[];
  defaultTransport: TransportMode;
  proxy: {
    enabled: boolean;
    basePath: string;
    allowedHosts: string[];
  };
  refreshIntervalMs: number;
}

export interface AboutInfo {
  versions?: string[];
  version?: string;
  build?: string | number;
  [key: string]: unknown;
}

export interface SignalApiErrorPayload {
  error?: string;
  account?: string;
  challenge_tokens?: string[];
  [key: string]: unknown;
}

export interface ContactRecord {
  number?: string;
  uuid?: string;
  name?: string;
  profileName?: string;
  username?: string;
  [key: string]: unknown;
}

export type GroupPermissionMode = "only-admins" | "every-member";
export type GroupLinkMode = "disabled" | "enabled" | "enabled-with-approval";

export interface GroupPermissions {
  add_members?: GroupPermissionMode;
  edit_group?: GroupPermissionMode;
  send_messages?: GroupPermissionMode;
}

export interface GroupRecord {
  id?: string;
  name?: string;
  description?: string;
  internal_id?: string;
  expiration_time?: number;
  invite_link?: string;
  members?: string[];
  admins?: string[];
  pending_invites?: string[];
  pending_requests?: string[];
  blocked?: boolean;
  permissions?: GroupPermissions;
  [key: string]: unknown;
}

export interface AttachmentRecord {
  id?: string;
  attachment?: string;
  name?: string;
  path?: string;
  contentType?: string;
  [key: string]: unknown;
}

export interface ReceiveMessageRecord {
  envelope?: {
    sourceNumber?: string;
    sourceName?: string;
    timestamp?: string | number;
  };
  account?: string;
  message?: {
    message?: string;
    attachments?: Array<Record<string, unknown>>;
  };
  [key: string]: unknown;
}

export interface SendMessagePayload {
  number: string;
  recipients: string[];
  message: string;
  base64_attachments?: string[];
  text_mode?: "normal" | "styled";
  notify_self?: boolean;
}
