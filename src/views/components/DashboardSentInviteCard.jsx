function getDaysUntilExpire(expiresAt) {
  if (!expiresAt) return null;
  const expiryTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiryTime)) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((expiryTime - Date.now()) / msPerDay);
}

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardSentInviteCard({
  groupName,
  recipientName,
  recipientEmail,
  expiresAt,
  onDelete,
  onRefresh,
  actionDisabled = false,
  deleteTitle,
  refreshTitle,
  highlighted = false
}) {
  const daysUntilExpire = getDaysUntilExpire(expiresAt);
  const recipientLabel = recipientName && recipientEmail
    ? `${recipientName} (${recipientEmail})`
    : recipientName || recipientEmail || "-";

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
        <div className="dashboard-sent-invite-copy">
          <div className="dashboard-sent-invite-group-row">
            <strong className="dashboard-sent-invite-group">{groupName || "Group"}</strong>
            {daysUntilExpire !== null && (
              <time
                className="dashboard-sent-invite-days"
                data-tooltip={expiresAt ? new Date(expiresAt).toLocaleString() : ""}
                dateTime={expiresAt || undefined}
                aria-label={expiresAt ? `Expires at ${new Date(expiresAt).toLocaleString()}` : undefined}
              >
                {`${daysUntilExpire} days until expire`}
              </time>
            )}
          </div>
          <p className="dashboard-sent-invite-to"><span className="sr-only">To:</span> {recipientLabel}</p>
        </div>

        <div className="dashboard-sent-invite-actions">
          <button
            type="button"
            className="btn-inline dashboard-invite-action dashboard-sent-invite-refresh"
            onClick={onRefresh}
            disabled={actionDisabled}
            title={refreshTitle}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn-inline dashboard-invite-action dashboard-sent-invite-action"
            onClick={onDelete}
            disabled={actionDisabled}
            title={deleteTitle}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Meta area removed; expiry moved inline with group name and shows full date on hover */}
    </li>
  );
}
