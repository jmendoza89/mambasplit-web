import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";
import { formatMoney, initials } from "../utils/formatters";
import { isGroupOwner as checkGroupOwnership } from "../utils/groupOwnership";
import { isUuid } from "../utils/validation";
import { friendService } from "../services/friendService";
import DashboardEmptyState from "./components/DashboardEmptyState";
import DashboardGroupCardItem from "./components/DashboardGroupCardItem";
import DashboardHero from "./components/DashboardHero";
import DashboardPendingInviteCard from "./components/DashboardPendingInviteCard";
import { groupService } from "../services/groupService";

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
          onClick={(event) => event.stopPropagation()}
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

function balanceTone(netBalanceCents) {
  if (netBalanceCents > 0) return "positive";
  if (netBalanceCents < 0) return "negative";
  return "neutral";
}

function friendBalanceLabel(displayName, netBalanceCents) {
  const amount = formatMoney(Math.abs(netBalanceCents || 0) / 100);
  if (netBalanceCents > 0) return `${displayName} owes you ${amount}`;
  if (netBalanceCents < 0) return `You owe ${displayName} ${amount}`;
  return "All settled";
}

function sharedGroupsNetCents(sharedGroups) {
  if (!Array.isArray(sharedGroups)) return null;
  const numericBalances = sharedGroups
    .map((sharedGroup) => sharedGroup?.balanceCents)
    .filter((balanceCents) => typeof balanceCents === "number");
  if (!numericBalances.length) {
    return sharedGroups.length === 0 ? 0 : null;
  }
  return numericBalances.reduce((sum, balanceCents) => sum + balanceCents, 0);
}

function resolveFriendSummary(friend, detail) {
  const displayName = detail?.displayName || friend?.displayName || "Friend";
  const listCents = typeof friend?.netBalanceCents === "number" ? friend.netBalanceCents : null;
  const detailCents = typeof detail?.netBalanceCents === "number" ? detail.netBalanceCents : null;
  const rollupCents = sharedGroupsNetCents(detail?.sharedGroups);
  const detailLabel = String(detail?.netBalanceLabel || detail?.summary || "").trim();
  const listLabel = String(friend?.netBalanceLabel || "").trim();

  let netBalanceCents = listCents ?? 0;
  let netBalanceLabel = listLabel || friendBalanceLabel(displayName, netBalanceCents);

  if (!detail) {
    return {
      netBalanceCents,
      netBalanceLabel
    };
  }

  const hasRollupCents = typeof rollupCents === "number";
  const hasDetailCents = typeof detailCents === "number";

  if (hasRollupCents && hasDetailCents && rollupCents !== detailCents) {
    netBalanceCents = rollupCents;
    netBalanceLabel = friendBalanceLabel(displayName, rollupCents);
    return { netBalanceCents, netBalanceLabel };
  }

  if (hasDetailCents) {
    netBalanceCents = detailCents;
    netBalanceLabel = detailLabel || friendBalanceLabel(displayName, detailCents);
    return { netBalanceCents, netBalanceLabel };
  }

  if (hasRollupCents) {
    netBalanceCents = rollupCents;
    netBalanceLabel = friendBalanceLabel(displayName, rollupCents);
    return { netBalanceCents, netBalanceLabel };
  }

  if (detailLabel) {
    netBalanceLabel = detailLabel;
  }

  return {
    netBalanceCents,
    netBalanceLabel
  };
}

const MOBILE_SECTIONS = [
  { id: "groups", label: "Groups" },
  { id: "friends", label: "Friends" },
];

export default function DashboardView({
  selectedGroupId,
  groups,
  newGroupName,
  pendingInvites,
  pendingInvitesLoading,
  pendingInvitesError,
  groupOwnershipById = {},
  friendDirectory = [],
  friendsLoading = false,
  friendsError = "",
  selectedFriendId,
  onOpenGroupPage,
  onOpenAccount,
  onSelectFriend,
  onCreateGroup,
  onAcceptPendingInvite,
  onRefreshPendingInvites,
  setSelectedGroupId,
  setNewGroupName
}) {
  const { currentName, currentEmail, currentId, currentAvatarUrl, onLogout } = useAuth();
  const { busy } = useAlerts();
  const [invitePendingDecline, setInvitePendingDecline] = useState(null);
  const [friendSearch, setFriendSearch] = useState("");
  const [mobileSection, setMobileSection] = useState("groups");
  const [friendDetail, setFriendDetail] = useState(null);
  const [friendDetailLoading, setFriendDetailLoading] = useState(false);
  const hasPendingInviteContent = pendingInvitesLoading
    || Boolean(pendingInvitesError)
    || (pendingInvites || []).length > 0;

  const activeFriend = useMemo(() => {
    return friendDirectory.find((friend) => friend.id === selectedFriendId) || friendDirectory[0] || null;
  }, [friendDirectory, selectedFriendId]);
  const activeFriendSummary = useMemo(() => resolveFriendSummary(activeFriend, friendDetail), [activeFriend, friendDetail]);
  const activeFriendSharedGroupCount = useMemo(() => {
    if (Array.isArray(friendDetail?.sharedGroups)) {
      return friendDetail.sharedGroups.length;
    }
    return activeFriend?.sharedGroupCount || 0;
  }, [activeFriend?.sharedGroupCount, friendDetail?.sharedGroups]);

  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLowerCase();
    if (!query) return friendDirectory;
    return friendDirectory.filter((friend) => {
      const haystack = `${friend.displayName} ${friend.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [friendDirectory, friendSearch]);

  const totalOwedCents = useMemo(
    () => (groups || []).reduce((sum, g) => sum + Math.max(0, g.netBalanceCents || 0), 0),
    [groups]
  );
  const totalOweCents = useMemo(
    () => (groups || []).reduce((sum, g) => sum + Math.abs(Math.min(0, g.netBalanceCents || 0)), 0),
    [groups]
  );

  useEffect(() => {
    if (!activeFriend) {
      setFriendDetail(null);
      return;
    }
    let cancelled = false;
    setFriendDetailLoading(true);
    setFriendDetail(null);
    friendService.detail(activeFriend.id)
      .then((detail) => {
        if (!cancelled) {
          setFriendDetail(detail);
          setFriendDetailLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFriendDetail(null);
          setFriendDetailLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [activeFriend?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function isOwnedGroup(group) {
    return checkGroupOwnership(group, currentId, currentEmail, groupOwnershipById);
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
      window.alert("Invite deleted.");
    } catch (err) {
      window.alert(err?.message || "Could not decline invite.");
    } finally {
      setInvitePendingDecline(null);
    }
  }

  const groupsPanel = (
    <article
      className={`card panel section-panel dashboard-sidebar-panel dashboard-mobile-panel ${mobileSection === "groups" ? "is-active" : ""}`}
      data-mobile-panel="groups"
    >
      <h3>Groups</h3>
      <form className="inline-form" onSubmit={onCreateGroup}>
        <input
          type="text"
          placeholder="New group name"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          maxLength={200}
          required
        />
        <button type="submit" className="btn-secondary" disabled={busy}>
          Create
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
            title="No groups yet. Create one to get started."
            detail="Groups still live on the dashboard, just like they do now."
            icon="+"
          />
        ) : null}
      </ul>
    </article>
  );

  const invitesPanel = (
    <article
      className={`card panel section-panel dashboard-sidebar-panel dashboard-mobile-panel ${mobileSection === "groups" ? "is-active" : ""}`}
      data-mobile-panel="invites"
    >
      <div className="panel-header">
        <h3>Group invites</h3>
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
              expiresAt={invite.expiresAt}
              actionLabel="Accept"
              onAction={() => onAcceptPendingInvite(invite.id)}
              onDecline={() => setInvitePendingDecline(invite)}
              actionDisabled={busy || pendingInvitesLoading}
            />
          ))}
        </ul>
      ) : null}
    </article>
  );

  return (
    <section className="dash-wrap">
      <article className="card panel">
        <DashboardHero
          currentName={currentName}
          onOpenAccount={onOpenAccount}
          currentAvatarUrl={currentAvatarUrl}
          onLogout={onLogout}
          busy={busy}
          totalOwedCents={totalOwedCents}
          totalOweCents={totalOweCents}
        />

        <nav className="dashboard-mobile-sections" aria-label="Dashboard sections">
          {MOBILE_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`dashboard-mobile-section-tab ${mobileSection === section.id ? "is-active" : ""}`.trim()}
              aria-pressed={mobileSection === section.id}
              onClick={() => setMobileSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="dashboard-layout-b">
          <aside className="dashboard-social-sidebar">
            {groupsPanel}
            {hasPendingInviteContent ? invitesPanel : null}
          </aside>

          <section
            className={`card panel section-panel dashboard-layout-d-friends dashboard-mobile-panel ${mobileSection === "friends" ? "is-active" : ""}`}
            data-mobile-panel="friends"
          >
            <div className="panel-header">
              <div>
                <h3>Friends</h3>
                <p className="friends-panel-subtitle">Click a friend to see shared balances and expenses.</p>
              </div>
            </div>
            <div className="friends-search-shell dashboard-friend-search">
              <label htmlFor="dashboardFriendSearch">Find a friend</label>
              <input
                id="dashboardFriendSearch"
                type="text"
                placeholder="Search by name or email"
                value={friendSearch}
                onChange={(event) => setFriendSearch(event.target.value)}
              />
            </div>
            <ul className="dashboard-friend-list" style={{ gap: 0 }}>
              {friendsLoading ? (
                <li className="list-empty friend-empty-state">
                  <DashboardEmptyState
                    as="span"
                    className="list-empty list-empty-inline dashboard-empty-state-inline"
                    title="Loading friends..."
                    detail="Fetching your friend connections."
                    icon="o"
                  />
                </li>
              ) : friendsError ? (
                <li className="list-empty friend-empty-state">
                  <DashboardEmptyState
                    as="span"
                    className="list-empty list-empty-inline dashboard-empty-state-inline"
                    title={friendsError}
                    detail="Try refreshing the page to reload your friends."
                    icon="!"
                  />
                </li>
              ) : filteredFriends.map((friend) => {
                const isExpanded = friend.id === activeFriend?.id;
                const rowSummary = isExpanded
                  ? activeFriendSummary
                  : resolveFriendSummary(friend, null);
                return (
                  <li key={friend.id} className="dashboard-friend-accordion-item">
                    <button
                      type="button"
                      className={`dashboard-friend-accordion-trigger ${isExpanded ? "is-active" : ""}`.trim()}
                      onClick={() => onSelectFriend(friend.id)}
                      aria-expanded={isExpanded}
                    >
                      <span className="avatar dashboard-friend-list-avatar" aria-hidden="true">{initials(friend.displayName)}</span>
                      <span className="dashboard-friend-list-copy">
                        <strong>{friend.displayName}</strong>
                        <small>{friend.status === "Pending" ? "Invite pending" : (rowSummary.netBalanceLabel || "Friend")}</small>
                      </span>
                      <span className={`dashboard-friend-status-badge is-${friend.status.toLowerCase()}`.trim()}>
                        {friend.status === "Connected" ? "Friend" : "Pending"}
                      </span>
                    </button>
                    {isExpanded && (
                      <motion.div
                        className="dashboard-friend-accordion-body"
                        key="body"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        <div className="dashboard-friend-accordion-inner">
                          <div className={`dashboard-friend-accordion-balance-strip is-${balanceTone(activeFriendSummary.netBalanceCents)}`}>
                            <strong className={`dashboard-friend-accordion-balance-amount is-${balanceTone(activeFriendSummary.netBalanceCents)}`}>
                              {activeFriendSummary.netBalanceLabel}
                            </strong>
                            {activeFriendSharedGroupCount ? (
                              <span className="dashboard-friend-accordion-groups-count">
                                {activeFriendSharedGroupCount} shared group{activeFriendSharedGroupCount === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                          {friendDetailLoading ? (
                            <p className="dashboard-friend-accordion-empty">Loading...</p>
                          ) : friendDetail?.sharedGroups?.length ? (
                            <ul className="dashboard-friend-expense-list">
                              {friendDetail.sharedGroups.map((sharedGroup) => {
                                const group = groups.find((g) => g.id === sharedGroup.groupId);
                                return (
                                  <li key={sharedGroup.groupId} className="group-summary-card">
                                    <div className="group-summary-row">
                                      <div className="group-summary-select">
                                        <span className="member-avatar-wrap group-summary-avatar-wrap">
                                          <span className="avatar group-summary-avatar">{initials(sharedGroup.groupName)}</span>
                                        </span>
                                        <span className="group-summary-content">
                                          <span className="group-summary-title">{sharedGroup.groupName}</span>
                                          <span className={`dashboard-friend-expense-amount is-${balanceTone(sharedGroup.balanceCents)}`.trim()}>
                                            {sharedGroup.balanceLabel}
                                          </span>
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        className="btn-inline group-summary-open"
                                        onClick={() => group && onOpenGroupPage(group.id)}
                                        disabled={!group}
                                      >
                                        <span className="group-summary-open-icon" aria-hidden="true">{">"}</span>
                                        <span>View</span>
                                      </button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : (
                            <p className="dashboard-friend-accordion-empty">No shared expenses yet.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </li>
                );
              })}
              {!friendsLoading && !friendsError && !filteredFriends.length ? (
                <li className="list-empty friend-empty-state">No friends found.</li>
              ) : null}
            </ul>
          </section>
        </div>
      </article>

      <AnimatePresence>
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
