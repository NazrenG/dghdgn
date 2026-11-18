import { useCallback, useEffect, useState } from "react";
import { InteractionStatus } from "@azure/msal-browser";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { api, ApiError, Me } from "./api/client";
import { LoginPage } from "./components/LoginPage";
import { AccessDenied } from "./components/AccessDenied";
import { Dashboard } from "./components/Dashboard";
import { Spinner } from "./components/Spinner";

type MeState =
  | { status: "loading" }
  | { status: "ok"; me: Me }
  | { status: "denied"; email?: string }
  | { status: "error"; message: string };

function AuthenticatedApp() {
  const { instance, accounts } = useMsal();
  const [state, setState] = useState<MeState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const me = await api.getMe(instance);
      setState({ status: "ok", me });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const body = err.body as { email?: string } | undefined;
        setState({ status: "denied", email: body?.email ?? accounts[0]?.username });
      } else {
        setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      }
    }
  }, [instance, accounts]);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = () => instance.logoutRedirect({ account: instance.getActiveAccount() ?? undefined });

  switch (state.status) {
    case "loading":
      return <Spinner label="Checking your access…" />;
    case "denied":
      return <AccessDenied email={state.email} onSignOut={signOut} />;
    case "error":
      return (
        <div className="center-screen">
          <div className="card narrow">
            <h1>Something went wrong</h1>
            <p className="error-text">{state.message}</p>
            <div className="row">
              <button className="btn primary" onClick={() => void load()}>Try again</button>
              <button className="btn" onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>
      );
    case "ok":
      return <Dashboard me={state.me} onSignOut={signOut} />;
  }
}

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const { inProgress } = useMsal();

  if (!isAuthenticated) {
    if (inProgress !== InteractionStatus.None) {
      return <Spinner label="Signing you in…" />;
    }
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}
