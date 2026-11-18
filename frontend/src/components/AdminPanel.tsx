import { FormEvent, useCallback, useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { AllowedUser, api, ApiError, Me } from "../api/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminPanel({ me }: { me: Me }) {
  const { instance } = useMsal();
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"User" | "Admin">("User");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setListError(null);
    try {
      setUsers(await api.listAllowedUsers(instance));
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [instance]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.addAllowedUser(instance, normalized, role);
      setFormSuccess(`${created.email} can now sign in.`);
      setEmail("");
      setRole("User");
      await refresh();
    } catch (err) {
      setFormError(err instanceof ApiError || err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const runRowAction = async (id: number, action: () => Promise<unknown>) => {
    setBusyId(id);
    setListError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (u: AllowedUser) =>
    runRowAction(u.id, () => api.updateAllowedUser(instance, u.id, { isActive: !u.isActive }));

  const remove = (u: AllowedUser) => {
    if (!window.confirm(`Delete ${u.email}? They will no longer be able to sign in.`)) return;
    void runRowAction(u.id, () => api.deleteAllowedUser(instance, u.id));
  };

  return (
    <>
      <section className="card">
        <h2>Add allowed user</h2>
        <form className="add-form" onSubmit={(e) => void onSubmit(e)} noValidate>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            autoComplete="off"
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value as "User" | "Admin")} aria-label="Role">
            <option value="User">User</option>
            <option value="Admin">Admin</option>
          </select>
          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add user"}
          </button>
        </form>
        {formError && <p className="error-text">{formError}</p>}
        {formSuccess && <p className="success-text">{formSuccess}</p>}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Allowed users</h2>
          <span className="muted">{users.length} total</span>
        </div>

        {listError && <p className="error-text">{listError}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : users.length === 0 ? (
          <p className="muted">
            No users yet. <strong>{me.email}</strong> is the built-in admin and does not need to be listed.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.isActive ? "" : "inactive"}>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === "Admin" ? "badge-admin" : "badge-user"}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "badge-active" : "badge-muted"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="muted" title={u.createdBy ? `by ${u.createdBy}` : undefined}>
                      {new Date(u.createdAtUtc).toLocaleDateString()}
                    </td>
                    <td className="actions">
                      <button className="btn small" disabled={busyId === u.id} onClick={() => void toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button className="btn small danger" disabled={busyId === u.id} onClick={() => remove(u)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
