import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";
import { isGroupOwner as checkGroupOwnership } from "../utils/groupOwnership";

export default function DashboardView({
  selectedGroupId,
  groups,
  newGroupName,
  inviteEmail,
  inviteResult,
  sentInvites,
  pendingInvites,
  pendingInvitesLoading,
  pendingInvitesError,
  groupOwnershipById = {},
  onOpenGroupPage,
  onCreateGroup,
  onCreateInvite,
  onAcceptPendingInvite,
  onDeleteInvite,
  onRefreshPendingInvites,
  setSelectedGroupId,
  setNewGroupName,
  setInviteEmail
}) {
  const { currentName, currentEmail, currentId, onLogout } = useAuth();
  const { busy } = useAlerts();
  function formatTimestamp(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  }

  function isOwnedGroup(group) {
    return checkGroupOwnership(group, currentId, currentEmail, groupOwnershipById);
  }

  return (
    <section className="dash-wrap">
      <article className="card panel">
        <div className="dash-top">
          <div>
            <h2>Welcome, {currentName}</h2>
            <p>React test dashboard for groups and invite workflows.</p>
          </div>
          <div className="dash-top-actions">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onOpenGroupPage(selectedGroupId)}
              disabled={!selectedGroupId || busy}
            >
              Open Group Page
            </button>
            <button className="btn-ghost" type="button" onClick={onLogout} disabled={busy}>
              Logout
            </button>
          </div>
        </div>

        <div className="grid">
          <section className="card stat">
            <h4>Display Name</h4>
            <strong>{currentName}</strong>
          </section>
          <section className="card stat">
            <h4>Email</h4>
            <strong>{currentEmail}</strong>
          </section>
          <section className="card stat">
            <h4>User ID</h4>
            <strong>{currentId}</strong>
          </section>
        </div>

        <div className="workspace-grid">
          <article className="card panel section-panel">
            <h3>Groups</h3>
            <form className="inline-form" onSubmit={onCreateGroup}>
              <input
                type="text"
                placeholder="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={200}
                required
              />
              <button type="submit" className="btn-secondary" disabled={busy}>
                Create Group
              </button>
            </form>

            <ul className="list group-list">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className={[
                    group.id === selectedGroupId ? "is-active" : "",
                    isOwnedGroup(group) ? "group-owner" : "group-member"
                  ].filter(Boolean).join(" ")}
                >
                  <div className="list-row">
                    <button
                      type="button"
                      className="list-btn"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <span className="group-name-stack">
                        <span>{group.name}</span>
                        <span className={`group-role-chip ${isOwnedGroup(group) ? "chip-owner" : "chip-member"}`}>
                          {isOwnedGroup(group) ? "Owner" : "Member"}
                        </span>
                      </span>
                      <code>{group.id.slice(0, 8)}...</code>
                    </button>
                    <button
                      type="button"
                      className="btn-inline"
                      onClick={() => onOpenGroupPage(group.id)}
                    >
                      View
                    </button>
                  </div>
                </li>
              ))}
              {!groups.length ? <li className="list-empty">No groups yet. Create one to start inviting.</li> : null}
            </ul>
          </article>

          <article className="card panel section-panel pending-invites-panel">
            <div className="panel-header">
              <h3>Pending Invites</h3>
              <button
                type="button"
                className="btn-inline"
                onClick={onRefreshPendingInvites}
                disabled={busy || pendingInvitesLoading}
              >
                Refresh
              </button>
            </div>

            {pendingInvitesLoading ? <p className="list-empty list-empty-inline">Loading pending invites...</p> : null}

            {!pendingInvitesLoading && pendingInvitesError ? <p className="list-empty list-empty-inline">{pendingInvitesError}</p> : null}

            {!pendingInvitesLoading && !pendingInvitesError ? (
              <ul className="list">
                {pendingInvites.map((invite) => (
                  <li key={invite.id}>
                    <div className="list-row">
                      <span>{invite.groupName}</span>
                      <button
                        type="button"
                        className="btn-inline"
                        onClick={() => onAcceptPendingInvite(invite.id)}
                        disabled={busy || pendingInvitesLoading}
                      >
                        Accept
                      </button>
                    </div>
                    <p><strong>Email:</strong> {invite.email}</p>
                    <p><strong>Sent:</strong> {formatTimestamp(invite.createdAt)}</p>
                    <p><strong>Expires:</strong> {formatTimestamp(invite.expiresAt)}</p>
                  </li>
                ))}
                {!pendingInvites.length ? (
                  <li className="list-empty">No pending invites</li>
                ) : null}
              </ul>
            ) : null}

          </article>

          <article className="card panel section-panel invites-panel">
            <div className="panel-header">
              <h3>Sent Invites</h3>
              <span className="panel-header-placeholder" aria-hidden="true" />
            </div>
            <ul className="list">
              {sentInvites.map((invite) => (
                <li key={invite.id}>
                  <div className="list-row">
                    <span>{invite.groupName}</span>
                    <button
                      type="button"
                      className="btn-inline"
                      onClick={() => onDeleteInvite(invite)}
                      disabled={busy || !invite.token}
                      title={invite.token ? "Delete invite" : "Invite token unavailable"}
                    >
                      Delete
                    </button>
                  </div>
                  <p><strong>Email:</strong> {invite.email}</p>
                  <p><strong>Sent:</strong> {formatTimestamp(invite.createdAt)}</p>
                  <p><strong>Expires:</strong> {formatTimestamp(invite.expiresAt)}</p>
                </li>
              ))}
              {!sentInvites.length ? (
                <li className="list-empty">No sent invites in this session</li>
              ) : null}
            </ul>

            {inviteResult ? (
              <div className="result-box">
                <p><strong>Last Token:</strong> <code>{inviteResult.token}</code></p>
                <p><strong>Email:</strong> {inviteResult.email}</p>
                <p><strong>Expires:</strong> {inviteResult.expiresAt}</p>
              </div>
            ) : null}
          </article>

          <article className="card panel section-panel create-invite-panel">
            <h3>Create Invite</h3>
            <form onSubmit={onCreateInvite}>
              <div className="field">
                <label htmlFor="groupSelect">Group</label>
                <select
                  id="groupSelect"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  required
                  disabled={!groups.length}
                >
                  {!groups.length ? <option value="">No groups available</option> : null}
                  {groups.map((group) => (
                    <option value={group.id} key={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="inviteEmail">Invite Email</label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                />
              </div>

              <div className="actions">
                <button type="submit" className="btn-primary" disabled={busy || !groups.length}>
                  Create Invite
                </button>
              </div>
            </form>

          </article>
        </div>
      </article>
    </section>
  );
}
