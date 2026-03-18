import { initials } from "../../utils/formatters";

export default function DashboardHero({
  currentName,
  currentEmail,
  selectedGroupId,
  busy,
  pendingInvitesLoading,
  onOpenGroupPage,
  onRefreshPendingInvites,
  onLogout
}) {
  return (
    <section className="dashboard-hero card">
      <div className="dashboard-hero-head">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-kicker">MambaSplit Workspace</p>
          <h2>Welcome, {currentName}</h2>
          <p>React test dashboard for groups and invite workflows.</p>
        </div>

        <div className="dashboard-hero-side">
          <div className="avatar dashboard-hero-avatar" aria-hidden="true">{initials(currentName)}</div>
          <div className="dash-top-actions">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onOpenGroupPage(selectedGroupId)}
              disabled={!selectedGroupId || busy}
            >
              Open Group Page
            </button>
            <button
              type="button"
              className="btn-inline"
              onClick={onRefreshPendingInvites}
              disabled={busy || pendingInvitesLoading}
            >
              Refresh
            </button>
            <button className="btn-ghost" type="button" onClick={onLogout} disabled={busy}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-hero-stats">
        <section className="dashboard-hero-stat">
          <h4>Display Name</h4>
          <strong>{currentName}</strong>
        </section>
        <section className="dashboard-hero-stat">
          <h4>Email</h4>
          <strong>{currentEmail}</strong>
        </section>
      </div>
    </section>
  );
}
