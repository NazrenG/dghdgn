export function AccessDenied({ email, onSignOut }: { email?: string; onSignOut: () => void }) {
  return (
    <div className="center-screen">
      <div className="card narrow denied-card" role="alert">
        <div className="denied-icon" aria-hidden="true">⛔</div>
        <h1>Access Denied: Your email is not authorized</h1>
        {email && (
          <p>
            You are signed in as <strong>{email}</strong>, which is not on the list of allowed users.
          </p>
        )}
        <p className="muted">Ask an administrator to add your email, then sign in again.</p>
        <button className="btn primary" onClick={onSignOut}>
          Sign out / use a different account
        </button>
      </div>
    </div>
  );
}
