import { Configuration, LogLevel, RedirectRequest } from "@azure/msal-browser";

const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID ?? "").trim();
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID ?? "").trim() || "common";

export const configError: string | null =
  !clientId || clientId.startsWith("PASTE-")
    ? "VITE_AZURE_CLIENT_ID is not set. Paste your App Registration's Application (client) ID into frontend/.env and restart `npm run dev`."
    : null;

export const apiBaseUrl = ((import.meta.env.VITE_API_BASE_URL ?? "").trim() || "http://localhost:5080").replace(/\/+$/, "");

/** Delegated scope exposed by the API ("Expose an API" blade in Entra ID). */
export const apiScope = (import.meta.env.VITE_API_SCOPE ?? "").trim() || `api://${clientId}/access_as_user`;

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
