export default function DashboardView({
  currentName,
  currentEmail,
  currentId,
  selectedGroupId,
  groups,
  newGroupName,
  inviteEmail,
  acceptToken,
  inviteResult,
  busy,
  onOpenGroupPage,
  onLogout,
  onCreateGroup,
  onCreateInvite,
  onAcceptInvite,
  setSelectedGroupId,
  setNewGroupName,
  setInviteEmail,
  setAcceptToken
}) {
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

            <ul className="list">
              {groups.map((group) => (
                <li key={group.id} className={group.id === selectedGroupId ? "is-active" : ""}>
                  <div className="list-row">
                    <button
                      type="button"
                      className="list-btn"
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <span>{group.name}</span>
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

          <article className="card panel section-panel">
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

            {inviteResult ? (
              <div className="result-box">
                <p><strong>Token:</strong> <code>{inviteResult.token}</code></p>
                <p><strong>Email:</strong> {inviteResult.email}</p>
                <p><strong>Expires:</strong> {inviteResult.expiresAt}</p>
              </div>
            ) : null}
          </article>

          <article className="card panel section-panel">
            <h3>Accept Invite</h3>
            <form onSubmit={onAcceptInvite}>
              <div className="field">
                <label htmlFor="acceptToken">Invite Token</label>
                <input
                  id="acceptToken"
                  type="text"
                  value={acceptToken}
                  onChange={(e) => setAcceptToken(e.target.value)}
                  placeholder="Paste invite token"
                  required
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn-secondary" disabled={busy}>
                  Accept Invite
                </button>
              </div>
            </form>
          </article>
        </div>
      </article>
    </section>
  );
}
