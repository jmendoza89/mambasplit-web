import { useEffect, useRef, useState } from "react";
import { initials } from "../../utils/formatters";

export default function DashboardHero({
  currentName,
  currentEmail,
  currentAvatarUrl,
  selectedGroupId,
  busy,
  pendingInvitesLoading,
  onOpenGroupPage,
  onOpenAccount,
  onRefreshPendingInvites,
  onLogout
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <section className="dashboard-hero card">
      <div className="dashboard-hero-head">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-kicker">MambaSplit Workspace</p>
          <h2>Welcome, {currentName}</h2>
          <p>React test dashboard for groups and invite workflows.</p>
        </div>

        <div className="dashboard-hero-side">
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
              className="btn-inline dashboard-hero-refresh"
              onClick={onRefreshPendingInvites}
              disabled={busy || pendingInvitesLoading}
            >
              Refresh
            </button>
            <div className="account-menu" ref={menuRef}>
              <button
                className="account-menu-trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                {currentAvatarUrl ? (
                  <img className="account-menu-avatar-image" src={currentAvatarUrl} alt="" aria-hidden="true" />
                ) : (
                  <span className="avatar dashboard-hero-avatar" aria-hidden="true">{initials(currentName)}</span>
                )}
                <span className="account-menu-name">{currentName}</span>
              </button>

              {menuOpen ? (
                <div className="account-menu-dropdown" role="menu">
                  <button
                    type="button"
                    className="account-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAccount();
                    }}
                  >
                    Your Account
                  </button>
                  <button
                    type="button"
                    className="account-menu-item account-menu-item-danger"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    disabled={busy}
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
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
