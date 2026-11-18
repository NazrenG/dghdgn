# Microsoft Sign-in + Email Allowlist

A small full-stack app: **React + TypeScript (Vite) + MSAL** on the front, **ASP.NET Core 8 Web API + EF Core + SQL Server** on the back.

- Sign in with a **work/school (Entra ID) or personal Microsoft account**.
- Only emails in the `AllowedUsers` table (and active) get in. Everyone else gets **403** from the API and an **"Access Denied: Your email is not authorized"** screen.
- **`quliyevanzrin162@gmail.com` is always an Admin**, even when the table is empty.
- Admins get a panel to add emails (User or Admin role), deactivate/reactivate, and delete them. A newly added email can sign in right away.

| Part | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5080 (`/api/health` is public) |

---

## 1. One-time Azure setup (Entra ID App Registration)

You need **one** app registration. It's both the SPA (login) and the API (token audience).

1. **Azure Portal → Microsoft Entra ID → App registrations → New registration**
   - Name: anything, e.g. `Allowlist App`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: platform **Single-page application (SPA)**, value **`http://localhost:5173`**
   - Register. Copy the **Application (client) ID** (and the **Directory (tenant) ID** if you want to restrict to one org).
2. **Expose an API**
   - Next to *Application ID URI* click **Add** and accept the default **`api://<client-id>`** → Save.
   - **Add a scope**: name **`access_as_user`**, who can consent: **Admins and users**, fill the display names/descriptions → Add scope.
3. **Manifest**: make sure the access-token version is 2 (required for personal accounts). In the manifest set
   `"requestedAccessTokenVersion": 2` (inside `"api"` in the new manifest editor; called `accessTokenAcceptedVersion` in the legacy one). Registrations created with "personal accounts" usually already have this.
4. *(Optional but recommended)* **Token configuration → Add optional claim → Access → `email`.** The backend falls back to `preferred_username` / `upn` if `email` is missing, so this isn't required.

No client secret is needed: the SPA uses PKCE and the API only validates tokens.

## 2. Paste your values (the checklist)

| # | Value | File | Key |
|---|---|---|---|
| 1 | Application (client) ID | `backend/appsettings.Development.json` | `AzureAd.ClientId` |
| 2 | Tenant: `common` (default) or your Directory (tenant) ID | `backend/appsettings.Development.json` | `AzureAd.TenantId` |
| 3 | SQL Server connection string | `backend/appsettings.Development.json` | `ConnectionStrings.DefaultConnection` |
| 4 | Application (client) ID (same as #1) | `frontend/.env` | `VITE_AZURE_CLIENT_ID` |
| 5 | Tenant (same as #2) | `frontend/.env` | `VITE_AZURE_TENANT_ID` |

Connection string examples:

```text
# Local SQL Server, Windows auth
Server=localhost;Database=AllowlistAppDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true

# LocalDB (Visual Studio on Windows)
Server=(localdb)\\MSSQLLocalDB;Database=AllowlistAppDb;Trusted_Connection=True;MultipleActiveResultSets=true

# SQL Server in Docker / SQL auth
Server=localhost,1433;Database=AllowlistAppDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True
```

(Inside JSON, a backslash must be written as `\\`.)

> ⚠️ Once you've pasted real values, don't commit them back to a public repo. To keep git from picking up your local edits:
> `git update-index --skip-worktree backend/appsettings.Development.json frontend/.env`

## 3. Run it

Prerequisites: **.NET 8 SDK**, **Node.js 18+**, a reachable **SQL Server**.

```bash
# Backend (terminal 1)
cd backend
dotnet tool restore          # installs dotnet-ef locally (pinned in .config/dotnet-tools.json)
dotnet ef database update    # creates the DB + AllowedUsers table from the included InitialCreate migration
dotnet run                   # http://localhost:5080
```

```bash
# Frontend (terminal 2)
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

`dotnet ef database update` is optional in Development: the API also applies pending migrations on startup (`Database:ApplyMigrationsOnStartup: true` in `appsettings.Development.json`).

Open http://localhost:5173, click **Sign in with Microsoft**, and sign in as `quliyevanzrin162@gmail.com` to get the admin panel.

---

## How it works

**Auth flow**
1. The SPA calls `loginRedirect` with scope `api://<client-id>/access_as_user` (authority `https://login.microsoftonline.com/<tenant>`).
2. Every API call sends the access token as `Authorization: Bearer …` (acquired silently, falling back to a redirect when interaction is required).
3. The API validates it with `Microsoft.Identity.Web` (signature, issuer — including multi-tenant/`common` — audience `<client-id>` or `api://<client-id>`, and that a scope is present).

**Email & allowlist** (`backend/Auth/EmailClaimExtractor.cs`, `backend/Services/UserAccessService.cs`)
- Email = first of `email` → `preferred_username` → `upn`, normalized with `.Trim().ToLowerInvariant()`.
- Bootstrap admin `quliyevanzrin162@gmail.com` → always allowed, always `Admin`.
- Otherwise: allowed only if an **active** row with that email exists; the row's `Role` (`User`/`Admin`) is used.
- The check is a **fallback authorization policy**, so every endpoint is protected unless explicitly `[AllowAnonymous]`. It's evaluated on every request, so adding/deactivating a user takes effect immediately.

**API**

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/health` | anyone | liveness |
| GET | `/api/me` | allowlisted | `{ email, name, role, isAdmin, isBootstrapAdmin }`; **403** `{ error: "email_not_authorized", message: "Access Denied: Your email is not authorized" }` otherwise |
| GET | `/api/allowed-users` | Admin | list |
| POST | `/api/allowed-users` | Admin | `{ email, role? }` → 201; 409 if already active; re-activates a deactivated email |
| PATCH | `/api/allowed-users/{id}` | Admin | `{ isActive?, role? }` |
| DELETE | `/api/allowed-users/{id}` | Admin | 204 |

Admins can't deactivate, demote, or delete themselves (prevents lockout); the bootstrap admin can't be locked out at all.

**Database**: table `AllowedUsers(Id, Email nvarchar(320) UNIQUE, Role, IsActive, CreatedAtUtc, CreatedBy)`. Migration in `backend/Data/Migrations`. To add migrations later: `dotnet ef migrations add <Name> -o Data/Migrations`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `AADSTS50011` redirect URI mismatch | The SPA redirect URI must be exactly `http://localhost:5173` under the **Single-page application** platform (not "Web"). |
| `AADSTS65005` / `invalid_resource` / scope not found | Step 2 of Azure setup: Application ID URI `api://<client-id>` and scope `access_as_user` must exist. |
| Personal account login fails with token version error | Step 3: `requestedAccessTokenVersion` must be `2`. |
| 401 from the API right after login | ClientId in backend and frontend must be the same value; restart `dotnet run` after editing. |
| "Cannot reach the API" | Backend not running on port 5080, or `VITE_API_BASE_URL` changed. |
| CORS error | Frontend must be on `http://localhost:5173`, or add your origin to `Cors:AllowedOrigins`. |
| Port 5173 in use | Vite uses `strictPort`; free the port (it must match the registered redirect URI). |
