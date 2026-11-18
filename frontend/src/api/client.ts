import {
  IPublicClientApplication,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { apiBaseUrl, apiScope } from "../auth/msalConfig";

export interface Me {
  email: string;
  name: string | null;
  role: "User" | "Admin";
  isAdmin: boolean;
  isBootstrapAdmin: boolean;
}

export interface AllowedUser {
  id: number;
  email: string;
  role: "User" | "Admin";
  isActive: boolean;
  createdAtUtc: string;
  createdBy: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAccessToken(msal: IPublicClientApplication): Promise<string> {
  const account = msal.getActiveAccount() ?? msal.getAllAccounts()[0];
  if (!account) {
    throw new ApiError(401, "Not signed in.");
  }
  try {
    const result = await msal.acquireTokenSilent({ scopes: [apiScope], account });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await msal.acquireTokenRedirect({ scopes: [apiScope], account });
      // The page navigates away; this promise never meaningfully resolves.
      return new Promise<string>(() => {});
    }
    throw err;
  }
}

function extractMessage(body: unknown, fallback: string): { message: string; code?: string } {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (b.errors && typeof b.errors === "object") {
      const first = Object.values(b.errors as Record<string, string[]>).flat()[0];
      if (first) return { message: first, code: "validation" };
    }
    if (typeof b.message === "string") return { message: b.message, code: typeof b.error === "string" ? b.error : undefined };
    if (typeof b.title === "string") return { message: b.title };
  }
  return { message: fallback };
}

async function request<T>(msal: IPublicClientApplication, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken(msal);

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new ApiError(0, `Cannot reach the API at ${apiBaseUrl}. Is the backend running (dotnet run in backend/)?`);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const { message, code } = extractMessage(body, `Request failed with status ${response.status}.`);
    throw new ApiError(response.status, message, code, body);
  }

  return body as T;
}

export const api = {
  getMe: (msal: IPublicClientApplication) => request<Me>(msal, "/api/me"),

  listAllowedUsers: (msal: IPublicClientApplication) => request<AllowedUser[]>(msal, "/api/allowed-users"),

  addAllowedUser: (msal: IPublicClientApplication, email: string, role: "User" | "Admin") =>
    request<AllowedUser>(msal, "/api/allowed-users", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateAllowedUser: (msal: IPublicClientApplication, id: number, patch: { isActive?: boolean; role?: "User" | "Admin" }) =>
    request<AllowedUser>(msal, `/api/allowed-users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  deleteAllowedUser: (msal: IPublicClientApplication, id: number) =>
    request<void>(msal, `/api/allowed-users/${id}`, { method: "DELETE" }),
};
