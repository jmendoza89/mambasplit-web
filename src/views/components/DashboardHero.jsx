import { useEffect, useRef, useState } from "react";
import { formatMoney, initials } from "../../utils/formatters";

export default function DashboardHero({
  currentName,
  currentAvatarUrl,
  busy,
  totalOwedCents,
  totalOweCents,
  onOpenAccount,
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
    <section className="dashboard-hero">
      <div className="dashboard-hero-summary-container">
        <div className="summary-card">
          <span className="summary-card-label">You're Owed</span>
          <strong className="summary-card-value is-positive">{formatMoney((totalOwedCents || 0) / 100)}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-card-label">You Owe</span>
          <strong className="summary-card-value is-negative">{formatMoney((totalOweCents || 0) / 100)}</strong>
        </div>

        <div className="summary-card account-menu" ref={menuRef}>
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
              <span className="avatar summary-card-avatar" aria-hidden="true">{initials(currentName)}</span>
            )}
            <span className="summary-card-name">{currentName}</span>
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
    </section>
  );
}
