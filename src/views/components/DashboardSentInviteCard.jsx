function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardSentInviteCard({
  groupName,
  email,
  createdAt,
  expiresAt,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionTitle,
  highlighted = false
}) {
  return (
    <li
      className={joinClasses(
        "dashboard-invite-card",
        "dashboard-invite-card-sent",
        "dashboard-sent-invite-card",
        highlighted ? "dashboard-invite-card-highlight" : ""
      )}
    >
      <div className="dashboard-sent-invite-head">
        <strong className="dashboard-sent-invite-group">{groupName || "Group"}</strong>
        <button
          type="button"
          className="btn-inline dashboard-invite-action dashboard-sent-invite-action"
          onClick={onAction}
          disabled={actionDisabled}
          title={actionTitle}
        >
          {actionLabel}
        </button>
      </div>

      <p className="dashboard-sent-invite-to">
        <strong>To:</strong> {email || "-"}
      </p>

      <div className="dashboard-sent-invite-meta">
        <p><strong>Sent:</strong> {createdAt || "-"}</p>
        <p><strong>Expires:</strong> {expiresAt || "-"}</p>
      </div>
    </li>
  );
}
