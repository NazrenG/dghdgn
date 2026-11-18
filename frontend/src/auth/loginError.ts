/** Holds the error from the last login redirect so the login page can display it. */
let loginError: string | null = null;

export function setLoginError(message: string | null): void {
  loginError = message;
}

export function getLoginError(): string | null {
  return loginError;
}
