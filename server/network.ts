const PRIVATE_HOSTNAME_SUFFIXES = [".local", ".lan", ".home"];
const STATIC_ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal"]);

export function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const [a, b] = match.slice(1).map(Number);
  if (a === 10 || a === 127) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return false;
}

export function isLanSafeHost(hostname: string, allowList: string[]) {
  const normalized = hostname.toLowerCase();
  if (STATIC_ALLOWED_HOSTS.has(normalized)) {
    return true;
  }
  if (allowList.map((item) => item.toLowerCase()).includes(normalized)) {
    return true;
  }
  if (isPrivateIpv4(normalized)) {
    return true;
  }
  return PRIVATE_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}
