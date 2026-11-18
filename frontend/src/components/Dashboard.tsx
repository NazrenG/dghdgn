import { Me } from "../api/client";
import { AdminPanel } from "./AdminPanel";

export function Dashboard({ me, onSignOut }: { me: Me; onSignOut: () => void }) {
  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">Allowlist App</span>
        <button className="btn" onClick={onSignOut}>Sign out</button>
      </header>

      <main className="content">
        <section className="card">
          <h2>Your account</h2>
          <dl className="info-grid">
            <dt>Name</dt>
            <dd>{me.name ?? "—"}</dd>
            <dt>Email</dt>
            <dd>{me.email}</dd>
            <dt>Role</dt>
            <dd>
              <span className={`badge ${me.isAdmin ? "badge-admin" : "badge-user"}`}>{me.role}</span>
              {me.isBootstrapAdmin && <span className="badge badge-muted">bootstrap admin</span>}
            </dd>
          </dl>
        </section>

        {me.isAdmin ? (
          <AdminPanel me={me} />
        ) : (
          <section className="card">
            <h2>You're in</h2>
            <p className="muted">Your email is approved. Contact an administrator if you need admin access.</p>
          </section>
        )}
      </main>
    </div>
  );
}
