import type { ConnectionProfile, RuntimeConfig } from "@/lib/types";

interface ApiRuntimeState {
  profile?: ConnectionProfile;
  runtimeConfig?: RuntimeConfig;
}

let runtimeState: ApiRuntimeState = {};

export function setApiRuntimeState(nextState: ApiRuntimeState) {
  runtimeState = nextState;
}

export function getApiRuntimeState() {
  return runtimeState;
}
