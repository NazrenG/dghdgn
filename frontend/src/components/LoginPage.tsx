import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth/msalConfig";
import { MicrosoftLogo } from "./MicrosoftLogo";

export function LoginPage() {
  const { instance } = useMsal();
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setError(null);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="center-screen">
      <div className="card narrow login-card">
        <h1>Welcome</h1>
        <p className="muted">Sign in with your work, school, or personal Microsoft account to continue.</p>
        <button className="btn microsoft" onClick={() => void signIn()}>
          <MicrosoftLogo />
          <span>Sign in with Microsoft</span>
        </button>
        {error && <p className="error-text">{error}</p>}
        <p className="fine-print">Access is limited to approved email addresses.</p>
      </div>
    </div>
  );
}
