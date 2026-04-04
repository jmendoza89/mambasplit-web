function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardPendingInviteCard({
  groupName,
  senderName,
  senderEmail,
  expiresAt,
  actionLabel,
  onAction,
  onDecline,
  actionDisabled = false,
  actionTitle,
  highlighted = false
}) {
  const resolvedSenderName = senderName || "Unknown sender";
  function getDaysUntilExpire(expiresAt) {
    if (!expiresAt) return null;
    const expiryTime = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiryTime)) return null;
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.ceil((expiryTime - Date.now()) / msPerDay);
  }

  const daysUntilExpire = getDaysUntilExpire(expiresAt);

  return (
    <li
      className={joinClasses(
        "dashboard-invite-card",
        "dashboard-invite-card-pending",
        "dashboard-pending-invite-card",
        highlighted ? "dashboard-invite-card-highlight" : ""
      )}
    >
      <div className="dashboard-pending-invite-head">
        <div className="dashboard-sent-invite-copy">
          <strong className="dashboard-pending-invite-group">{groupName || "Group"}</strong>
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
          <p className="dashboard-pending-invite-from-line">{resolvedSenderName}</p>
          {senderEmail ? (
            <p className="dashboard-pending-invite-email">{senderEmail}</p>
          ) : null}
        </div>

        <div className="dashboard-sent-invite-actions">
          <button
            type="button"
            className="btn-inline dashboard-invite-action dashboard-pending-invite-accept"
            onClick={onAction}
            disabled={actionDisabled}
            title={actionTitle}
          >
            {actionLabel}
          </button>
          {onDecline ? (
            <button
              type="button"
              className="btn-inline dashboard-invite-action dashboard-pending-invite-decline"
              onClick={onDecline}
              disabled={actionDisabled}
              title="Decline invite"
            >
              Decline
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
