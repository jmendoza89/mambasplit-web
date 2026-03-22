import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";
import { isGroupOwner as checkGroupOwnership } from "../utils/groupOwnership";
import { isUuid } from "../utils/validation";
import DashboardEmptyState from "./components/DashboardEmptyState";
import DashboardGroupCardItem from "./components/DashboardGroupCardItem";
import DashboardHero from "./components/DashboardHero";
import DashboardPendingInviteCard from "./components/DashboardPendingInviteCard";
import DashboardSentInviteCard from "./components/DashboardSentInviteCard";
import { groupService } from "../services/groupService";

function RefreshInviteModal({ invite, busy, onCancel, onConfirm }) {
  if (!invite) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        onClick={onCancel}
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.section
          className="modal-card dashboard-refresh-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refreshInviteModalTitle"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="modal-header">
            <div>
              <h3 id="refreshInviteModalTitle">Refresh invite</h3>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onCancel}
              aria-label="Close refresh invite dialog"
            >
              x
            </button>
          </div>

          <div className="dashboard-refresh-modal-body">
            <p>
              Delete the current invite for <strong>{invite.sentToEmail ?? "-"}</strong> and resend a new one?
            </p>
            <div className="actions modal-actions dashboard-refresh-modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
                Confirm Refresh
              </button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

function DeclineInviteModal({ invite, busy, onCancel, onConfirm }) {
  if (!invite) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        onClick={onCancel}
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.section
          className="modal-card dashboard-refresh-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="declineInviteModalTitle"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="modal-header">
            <div>
              <h3 id="declineInviteModalTitle">Decline invite</h3>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={onCancel}
              aria-label="Close decline invite dialog"
            >
              x
            </button>
          </div>

          <div className="dashboard-refresh-modal-body">
            <p>
              Are you sure you want to decline the invite for <strong>{invite.groupName ?? invite.groupId ?? "Group"}</strong>?
            </p>
            <div className="actions modal-actions dashboard-refresh-modal-actions">
              <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>
                Decline Invite
              </button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

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
  onOpenAccount,
  onCreateGroup,
  onCreateInvite,
  onAcceptPendingInvite,
  onDeleteInvite,
  onRefreshInvite,
  onRefreshPendingInvites,
  setSelectedGroupId,
  setNewGroupName,
  setInviteEmail
}) {
  const { currentName, currentEmail, currentId, currentAvatarUrl, onLogout } = useAuth();
  const { busy } = useAlerts();
  const [invitePendingRefresh, setInvitePendingRefresh] = useState(null);
  const [invitePendingDecline, setInvitePendingDecline] = useState(null);

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

  function refreshInviteActionTitle(invite) {
    if (!invite?.sentByUserId) return "Invite sender is unavailable for this row.";
    if (invite.sentByUserId !== currentId) return "Only the member who sent this invite can refresh it.";
    if (!invite?.id && !invite?.token) return "Invite identifier is unavailable for this row.";
    if (!invite?.sentToEmail) return "Invite recipient email is unavailable for this row.";
    return "Refresh invite";
  }

  async function onConfirmRefreshInvite() {
    if (!invitePendingRefresh) return;
    await onRefreshInvite(invitePendingRefresh);
    setInvitePendingRefresh(null);
  }

  async function onConfirmDeclineInvite() {
    if (!invitePendingDecline) return;

    try {
      if (isUuid(invitePendingDecline.id)) {
        await groupService.cancelInviteById(invitePendingDecline.groupId, invitePendingDecline.id);
      } else {
        await groupService.cancelInvite(invitePendingDecline.groupId, invitePendingDecline.token);
      }
      await onRefreshPendingInvites();
      // lightweight feedback; controller alerts are preferred but not available here
      window.alert("Invite deleted.");
    } catch (err) {
      window.alert(err?.message || "Could not decline invite.");
    } finally {
      setInvitePendingDecline(null);
    }
  }

  function handleDecline(invite) {
    setInvitePendingDecline(invite || null);
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
          onOpenAccount={onOpenAccount}
          onRefreshPendingInvites={onRefreshPendingInvites}
          currentAvatarUrl={currentAvatarUrl}
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
                  <DashboardPendingInviteCard
                    key={invite.id}
                    groupName={invite.groupName}
                    senderName={invite.senderName}
                    senderEmail={invite.senderEmail}
                    createdAt={formatTimestamp(invite.createdAt)}
                    expiresAt={formatTimestamp(invite.expiresAt)}
                    actionLabel="Accept"
                    onAction={() => onAcceptPendingInvite(invite.id)}
                    onDecline={() => handleDecline(invite)}
                    actionDisabled={busy || pendingInvitesLoading}
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
                  recipientEmail={invite.sentToEmail}
                  senderName={invite.sentByDisplayName ?? invite.senderName}
                  senderEmail={invite.sentByEmail ?? invite.senderEmail}
                  expiresAt={invite.expiresAt}
                  onDelete={() => onDeleteInvite(invite)}
                  onRefresh={() => setInvitePendingRefresh(invite)}
                  actionDisabled={busy || !canDeleteSentInvite(invite)}
                  deleteTitle={deleteInviteActionTitle(invite)}
                  refreshTitle={refreshInviteActionTitle(invite)}
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

      <AnimatePresence>
        {invitePendingRefresh ? (
          <RefreshInviteModal
            invite={invitePendingRefresh}
            busy={busy}
            onCancel={() => setInvitePendingRefresh(null)}
            onConfirm={onConfirmRefreshInvite}
          />
        ) : null}
        {invitePendingDecline ? (
          <DeclineInviteModal
            invite={invitePendingDecline}
            busy={busy}
            onCancel={() => setInvitePendingDecline(null)}
            onConfirm={onConfirmDeclineInvite}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
