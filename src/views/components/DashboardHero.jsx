import { useEffect, useRef, useState } from "react";
import { initials } from "../../utils/formatters";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export default function DashboardHero({
  currentName,
  currentAvatarUrl,
  busy,
  groupCount,
  friendCount,
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
    <section className="dashboard-hero card">
      <div className="dashboard-hero-head">
        <div className="dashboard-hero-copy">
          <p className="dashboard-hero-kicker">{todayLabel()}</p>
          <p className="dashboard-hero-snapshot">
            {groupCount === 1 ? "1 group" : `${groupCount} groups`}
            {" · "}
            {friendCount === 1 ? "1 friend" : `${friendCount} friends`}
          </p>
        </div>

        <div className="dashboard-hero-actions">
          <div className="account-menu" ref={menuRef}>
            <button
              className="btn-hero-action account-menu-trigger"
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
    </section>
  );
}
