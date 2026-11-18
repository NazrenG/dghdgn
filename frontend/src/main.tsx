import React from "react";
import ReactDOM from "react-dom/client";
import {
  AuthenticationResult,
  EventMessage,
  EventType,
  PublicClientApplication,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import App from "./App";
import { configError, msalConfig } from "./auth/msalConfig";
import { ConfigErrorScreen } from "./components/ConfigErrorScreen";
import { setLoginError } from "./auth/loginError";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

async function bootstrap() {
  if (configError) {
    root.render(<ConfigErrorScreen message={configError} />);
    return;
  }

  const msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // Completes the redirect flow when returning from login.microsoftonline.com.
  const redirectResult = await msalInstance.handleRedirectPromise().catch((err) => {
    console.error("Login redirect failed", err);
    setLoginError(err instanceof Error ? err.message : String(err));
    return null;
  });
  if (redirectResult?.account) {
    msalInstance.setActiveAccount(redirectResult.account);
  } else if (!msalInstance.getActiveAccount()) {
    const [first] = msalInstance.getAllAccounts();
    if (first) msalInstance.setActiveAccount(first);
  }

  msalInstance.addEventCallback((event: EventMessage) => {
    if (
      (event.eventType === EventType.LOGIN_SUCCESS || event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) &&
      event.payload
    ) {
      const { account } = event.payload as AuthenticationResult;
      if (account) msalInstance.setActiveAccount(account);
    }
  });

  root.render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  );
}

bootstrap().catch((err) => {
  console.error(err);
  root.render(<ConfigErrorScreen message={`Failed to start authentication: ${String(err)}`} />);
});
