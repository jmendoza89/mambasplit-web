function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardInviteCard({
  groupName,
  email,
  createdAt,
  expiresAt,
  emailLabel = "Email",
  actionLabel,
  onAction,
  actionDisabled = false,
  actionTitle,
  variant = "pending",
  highlighted = false
}) {
  return (
    <li
      className={joinClasses(
        "dashboard-invite-card",
        `dashboard-invite-card-${variant}`,
        highlighted ? "dashboard-invite-card-highlight" : ""
      )}
    >
      <div className="dashboard-invite-main">
        <div className="list-row">
          <span>{groupName}</span>
          <button
            type="button"
            className="btn-inline dashboard-invite-action"
            onClick={onAction}
            disabled={actionDisabled}
            title={actionTitle}
          >
            {actionLabel}
          </button>
        </div>
        <p><strong>{emailLabel}:</strong> {email}</p>
        <p><strong>Sent:</strong> {createdAt}</p>
        <p><strong>Expires:</strong> {expiresAt}</p>
      </div>
    </li>
  );
}
