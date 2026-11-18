import { Configuration, LogLevel, RedirectRequest } from "@azure/msal-browser";

const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID ?? "").trim();
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID ?? "").trim() || "common";

export const configError: string | null =
  !clientId || clientId.startsWith("PASTE-")
    ? "VITE_AZURE_CLIENT_ID is not set. Paste your App Registration's Application (client) ID into frontend/.env and restart `npm run dev`."
    : null;

export const apiBaseUrl = ((import.meta.env.VITE_API_BASE_URL ?? "").trim() || "http://localhost:5080").replace(/\/+$/, "");

const DEFAULT_SCOPE_NAME = "access_as_user";

/**
 * Delegated scope exposed by the API ("Expose an API" blade in Entra ID).
 * A full scope is "<Application ID URI>/<scope name>". If VITE_API_SCOPE contains only the
 * Application ID URI (e.g. "api://<client-id>"), "/access_as_user" is appended, because a bare
 * URI makes Entra ID fail with AADSTS500011 ("resource principal named api:/ was not found").
 */
function resolveApiScope(): string {
  const raw = (import.meta.env.VITE_API_SCOPE ?? "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return `api://${clientId}/${DEFAULT_SCOPE_NAME}`;
  const uriOnly = /^[a-z][a-z0-9+.-]*:\/\/[^/]+\/?$/i;
  if (uriOnly.test(raw)) return `${raw.replace(/\/+$/, "")}/${DEFAULT_SCOPE_NAME}`;
  return raw;
}

export const apiScope = resolveApiScope();
export const tenant = tenantId;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error(message);
        else if (level === LogLevel.Warning) console.warn(message);
      },
    },
  },
};

export const loginRequest: RedirectRequest = {
  scopes: [apiScope],
  prompt: "select_account",
};
