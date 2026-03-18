import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";
import { isGroupOwner as checkGroupOwnership } from "../utils/groupOwnership";
import DashboardEmptyState from "./components/DashboardEmptyState";
import DashboardGroupCardItem from "./components/DashboardGroupCardItem";
import DashboardHero from "./components/DashboardHero";
import DashboardEmptyState from "./components/DashboardEmptyState";
import DashboardGroupCardItem from "./components/DashboardGroupCardItem";
import DashboardHero from "./components/DashboardHero";
import DashboardInviteCard from "./components/DashboardInviteCard";
import DashboardSentInviteCard from "./components/DashboardSentInviteCard";
import DashboardSentInviteCard from "./components/DashboardSentInviteCard";

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
  inviteCandidates = [],
  inviteCandidatesLoading = false,
  groupOwnershipById = {},
  onOpenGroupPage,
  onCreateGroup,
  onCreateInvite,
  onAcceptPendingInvite,
  onDeleteInvite,
  onRefreshPendingInvites,
  onStartPasswordReset,
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

  function canDeleteSentInvite(invite) {
    return Boolean((invite?.id || invite?.token) && invite?.sentByUserId && invite.sentByUserId === currentId);
  }

  function deleteInviteActionTitle(invite) {
    if (!invite?.sentByUserId) return "Invite sender is unavailable for this row.";
    if (invite.sentByUserId !== currentId) return "Only the member who sent this invite can delete it.";
    if (!invite?.id && !invite?.token) return "Invite identifier is unavailable for this row.";
    return "Delete invite";
  }

  return (
    <section className="dash-wrap">
      <article className="card panel">
        <DashboardHero
          currentName={currentName}
          currentEmail={currentEmail}
          selectedGroupId={selectedGroupId}
          busy={busy}
          pendingInvitesLoading={pendingInvitesLoading}
          onOpenGroupPage={onOpenGroupPage}
          onRefreshPendingInvites={onRefreshPendingInvites}
          onLogout={onLogout}
        />

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
                <DashboardGroupCardItem
                  key={group.id}
                  group={group}
                  isOwned={isOwnedGroup(group)}
                  isActive={group.id === selectedGroupId}
                  onSelect={setSelectedGroupId}
                  onOpen={onOpenGroupPage}
                />
              ))}
              {!groups.length ? (
                <DashboardEmptyState
                  as="li"
                  className="list-empty dashboard-empty-state-inline"
                  title="No groups yet. Create one to start inviting."
                  detail="Create your first group to begin tracking expenses and invites."
                  icon="+"
                />
              ) : null}
            </ul>
          </article>

          <article className="card panel section-panel pending-invites-panel">
            <div className="panel-header">
              <h3>Pending Invites</h3>
              <span className="panel-header-placeholder" aria-hidden="true" />
            </div>

            {pendingInvitesLoading ? (
              <DashboardEmptyState
                as="div"
                className="list-empty list-empty-inline dashboard-empty-state-inline"
                title="Loading pending invites..."
                detail="Checking for invites sent to your email."
                icon="o"
              />
            ) : null}

            {!pendingInvitesLoading && pendingInvitesError ? (
              <DashboardEmptyState
                as="div"
                className="list-empty list-empty-inline dashboard-empty-state-inline"
                title={pendingInvitesError}
                detail="Try refreshing to fetch the latest pending invites."
                icon="!"
              />
            ) : null}

            {!pendingInvitesLoading && !pendingInvitesError ? (
              <ul className="list dashboard-invite-list">
                {pendingInvites.map((invite) => (
                  <DashboardInviteCard
                    key={invite.id}
                    groupName={invite.groupName}
                    email={invite.sentToEmail ?? invite.email}
                    createdAt={formatTimestamp(invite.createdAt)}
                    expiresAt={formatTimestamp(invite.expiresAt)}
                    emailLabel="Email"
                    actionLabel="Accept"
                    onAction={() => onAcceptPendingInvite(invite.id)}
                    actionDisabled={busy || pendingInvitesLoading}
                    variant="pending"
                  />
                ))}
                {!pendingInvites.length ? (
                  <DashboardEmptyState
                    as="li"
                    className="list-empty dashboard-empty-state-inline"
                    title="No pending invites"
                    detail="You are all caught up right now."
                    icon="v"
                  />
                ) : null}
              </ul>
            ) : null}

          </article>

          <article className="card panel section-panel invites-panel">
            <div className="panel-header">
              <h3>Sent Invites</h3>
              <span className="panel-header-placeholder" aria-hidden="true" />
            </div>
            <ul className="list dashboard-invite-list">
              {sentInvites.map((invite) => (
                <DashboardSentInviteCard
                  key={invite.id}
                  groupName={invite.groupName}
                  email={invite.sentToEmail ?? invite.email}
                  createdAt={formatTimestamp(invite.createdAt)}
                  expiresAt={formatTimestamp(invite.expiresAt)}
                  actionLabel="Delete"
                  onAction={() => onDeleteInvite(invite)}
                  actionDisabled={busy || !canDeleteSentInvite(invite)}
                  actionTitle={deleteInviteActionTitle(invite)}
                  highlighted={inviteResult?.token === invite.token}
                />
              ))}
              {!sentInvites.length ? (
                <DashboardEmptyState
                  as="li"
                  className="list-empty dashboard-empty-state-inline"
                  title="No sent invites"
                  detail="Create an invite to bring members into a group."
                  icon="@"
                />
              ) : null}
            </ul>
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
                <select
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={!selectedGroupId || inviteCandidatesLoading || inviteCandidates.length === 0}
                >
                  {!selectedGroupId ? <option value="">Select a group first</option> : null}
                  {selectedGroupId && inviteCandidatesLoading ? <option value="">Loading users...</option> : null}
                  {selectedGroupId && !inviteCandidatesLoading && inviteCandidates.length === 0 ? (
                    <option value="">No eligible users found</option>
                  ) : null}
                  {inviteCandidates.map((candidate) => (
                    <option key={candidate.id || candidate.email} value={candidate.email}>
                      {candidate.displayName} - {candidate.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || !groups.length || !inviteEmail || inviteCandidatesLoading}
                >
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
