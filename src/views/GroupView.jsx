import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, formatMoney, initials } from "../utils/formatters";
import { resolveGroupBalanceCents } from "../utils/groupBalance";
import DashboardSentInviteCard from "./components/DashboardSentInviteCard";
import ExpenseCardItem from "./components/ExpenseCardItem";
import GroupDetailsHero from "./components/GroupDetailsHero";
import MemberCardItem from "./components/MemberCardItem";
import LeaveGroupModal from "./LeaveGroupModal";
import SettleUpModal from "./SettleUpModal";

const GROUP_MOBILE_SECTIONS = [
  { id: "members", label: "Members" },
  { id: "expenses", label: "Expenses" },
  { id: "settled", label: "Settled" }
];

export default function GroupView({
  selectedGroupId,
  groupLoading,
  isGroupOwner,
  displayedGroup,
  detailsGroupInfo,
  detailsMe,
  effectiveMemberCount,
  expenseCount,
  settlementCount,
  totalExpense,
  totalSettlementAmount,
  effectiveMyRole,
  groupError,
  displayMembers,
  expenses,
  settlements,
  settlementSuggestions,
  recentSettlementId,
  listVariants,
  itemVariants,
  sentInvites = [],
  inviteResult,
  onBackToDashboard,
  onCreateInvite,
  onDeleteInvite,
  onRefreshInvite,
  onCreateMockFriendInvite,
  onOpenExpenseModal,
  onOpenSettleUpModal,
  onCloseSettleUpModal,
  onCreateSettlement,
  isSettleUpModalOpen,
  onDeleteExpense,
  onRefreshGroupDetail,
  onDeleteGroup,
  isLeaveGroupModalOpen,
  onOpenLeaveGroupModal,
  onCancelLeaveGroup,
  onConfirmLeaveGroup
}) {
  const { currentId, currentName, onLogout } = useAuth();
  const { busy } = useAlerts();
  const showBalanceDiagnostics = false;
  const [collapsedSettlementIds, setCollapsedSettlementIds] = useState({});
  const [inviteFriendName, setInviteFriendName] = useState("");
  const [inviteFriendEmail, setInviteFriendEmail] = useState("");
  const [mobileSection, setMobileSection] = useState("members");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const groupAvatarMenuRef = useRef(null);
  const activeExpenses = useMemo(() => {
    const hiddenIds = new Set();
    for (const expense of expenses || []) {
      if (expense?.reversalOfExpenseId) {
        hiddenIds.add(expense.id);
        hiddenIds.add(expense.reversalOfExpenseId);
      }
    }
    return (expenses || []).filter((expense) => !hiddenIds.has(expense.id));
  }, [expenses]);
  const settledExpenseIdSet = useMemo(() => {
    const ids = new Set();
    for (const settlement of settlements || []) {
      for (const expenseId of settlement?.expenseIds || []) {
        if (expenseId) ids.add(expenseId);
      }
    }
    return ids;
  }, [settlements]);

  const unsettledExpenses = useMemo(
    () => activeExpenses.filter((expense) => (
      !expense.settlementId
      && !settledExpenseIdSet.has(expense.id)
    )),
    [activeExpenses, settledExpenseIdSet]
  );
  const groupSentInvites = useMemo(
    () => (sentInvites || []).filter((invite) => invite.groupId === selectedGroupId),
    [selectedGroupId, sentInvites]
  );
  const unsettledNetByUserId = useMemo(() => {
    const map = new Map();
    for (const member of displayMembers || []) {
      if (member?.id) map.set(member.id, 0);
    }

    for (const expense of unsettledExpenses || []) {
      const payerUserId = expense?.payerUserId;
      if (payerUserId) {
        map.set(payerUserId, (map.get(payerUserId) || 0) + (expense?.amountCents || 0));
      }

      for (const split of expense?.splits || []) {
        if (!split?.userId) continue;
        map.set(split.userId, (map.get(split.userId) || 0) - (split?.amountOwedCents || 0));
      }
    }

    return map;
  }, [displayMembers, unsettledExpenses]);
  const currentUserUnsettledNetCents = unsettledNetByUserId.get(currentId) || 0;
  const balanceDiagnostics = useMemo(() => {
    const rows = (displayMembers || []).map((member, index) => {
      const memberId = member?.id || `member-${index}`;
      const apiNetCents = typeof member?.netBalanceCents === "number" ? member.netBalanceCents : 0;
      const unsettledNetCents = unsettledNetByUserId.get(memberId) || 0;
      const deltaCents = apiNetCents - unsettledNetCents;

      return {
        memberId,
        name: member?.name || "Member",
        apiNetCents,
        unsettledNetCents,
        deltaCents
      };
    }).sort((a, b) => Math.abs(b.deltaCents) - Math.abs(a.deltaCents));

    return {
      rows,
      hasMismatch: rows.some((row) => row.deltaCents !== 0)
    };
  }, [displayMembers, unsettledNetByUserId]);
  const settledExpenseGroups = useMemo(() => {
    const grouped = activeExpenses.reduce((acc, expense) => {
      const effectiveSettlementId = expense.settlementId
        || (settledExpenseIdSet.has(expense.id)
          ? (settlements || []).find((settlement) => (settlement.expenseIds || []).includes(expense.id))?.id
          : null);
      if (!effectiveSettlementId) return acc;
      if (!acc[effectiveSettlementId]) acc[effectiveSettlementId] = [];
      acc[effectiveSettlementId].push(expense);
      return acc;
    }, {});

    return Object.entries(grouped).map(([settlementId, items]) => ({
      settlementId,
      expenses: items,
      totalCents: items.reduce((sum, expense) => sum + (expense.amountCents || 0), 0)
    }));
  }, [activeExpenses, settledExpenseIdSet, settlements]);

  const settlementMap = useMemo(
    () => new Map((settlements || []).map((settlement) => [settlement.id, settlement])),
    [settlements]
  );

  useEffect(() => {
    const nextState = {};
    for (const group of settledExpenseGroups) {
      nextState[group.settlementId] = true;
    }
    setCollapsedSettlementIds(nextState);
  }, [settledExpenseGroups, recentSettlementId]);

  function toggleSettlement(settlementId) {
    setCollapsedSettlementIds((prev) => ({ ...prev, [settlementId]: !prev[settlementId] }));
  }

  function clearInviteDraft() {
    setInviteFriendName("");
    setInviteFriendEmail("");
  }

  async function handleCreateGroupInvite(event) {
    event.preventDefault();
    const trimmedName = inviteFriendName.trim();
    const trimmedEmail = inviteFriendEmail.trim();
    if (!trimmedName || !trimmedEmail) return;

    const createdInvite = await onCreateInvite({
      name: trimmedName,
      email: trimmedEmail
    });
    if (!createdInvite) return;

    if (typeof onCreateMockFriendInvite === "function") {
      onCreateMockFriendInvite({
        name: trimmedName,
        email: trimmedEmail,
        groupName: detailsGroupInfo?.name || displayedGroup?.name || "Group"
      });
    }
    clearInviteDraft();
  }

  useEffect(() => {
    function handlePointerDown(event) {
      if (!groupAvatarMenuRef.current?.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <section className="dash-wrap">
      <article className="card panel">
        <div className="group-page-top">
          <button className="btn-ghost" type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
          <div className="group-actions-shell">
            <div className="group-action-primary">
              <button
                className="btn-primary"
                type="button"
                onClick={onOpenExpenseModal}
                disabled={!selectedGroupId || groupLoading}
              >
                Add Expense
              </button>
              <button
                className="btn-settle"
                type="button"
                onClick={onOpenSettleUpModal}
                disabled={!selectedGroupId || groupLoading || expenseCount === 0}
                title={expenseCount === 0 ? "No expenses to settle" : "Settle up payments"}
              >
                Settle Up
              </button>
            </div>
          </div>

          <div className="group-avatar-menu" ref={groupAvatarMenuRef}>
            <button
              className={`group-avatar-pill ${avatarMenuOpen ? "is-active" : ""}`.trim()}
              type="button"
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
              onClick={() => setAvatarMenuOpen((prev) => !prev)}
              title={`Actions for ${currentName || "User"}`}
              aria-label={`Group actions for ${currentName || "User"}`}
            >
              <span className="avatar top-user-avatar">{initials(currentName)}</span>
              <span className="group-avatar-pill-name">{currentName}</span>
            </button>

            {avatarMenuOpen ? (
              <div className="group-avatar-menu-dropdown" role="menu">
                <button
                  type="button"
                  className="group-avatar-menu-item group-avatar-menu-item-danger"
                  role="menuitem"
                  onClick={() => { setAvatarMenuOpen(false); onDeleteGroup(); }}
                  disabled={busy || groupLoading || !selectedGroupId || !isGroupOwner}
                  title={isGroupOwner ? "Delete this group" : "Only the group owner can delete this group"}
                >
                  Delete Group
                </button>
                <button
                  type="button"
                  className="group-avatar-menu-item group-avatar-menu-item-danger"
                  role="menuitem"
                  onClick={() => { setAvatarMenuOpen(false); onOpenLeaveGroupModal(); }}
                  disabled={busy || groupLoading || !selectedGroupId || isGroupOwner}
                  title={isGroupOwner ? "Group owners cannot leave their group" : "Leave this group"}
                >
                  Leave Group
                </button>
                <button
                  type="button"
                  className="group-avatar-menu-item"
                  role="menuitem"
                  onClick={() => { setAvatarMenuOpen(false); onLogout(); }}
                  disabled={busy}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <GroupDetailsHero
          groupName={detailsGroupInfo?.name || displayedGroup?.name || "Group"}
          createdAt={detailsGroupInfo?.createdAt}
          memberCount={effectiveMemberCount}
          expenseCount={expenseCount}
          totalExpense={totalExpense}
          settlementCount={settlementCount}
          totalSettlementAmount={totalSettlementAmount}
          netBalanceCents={resolveGroupBalanceCents(displayedGroup, detailsMe)}
          role={effectiveMyRole}
          isGroupOwner={isGroupOwner}
        />

        {!groupLoading ? (
          <nav className="group-mobile-sections" aria-label="Group detail sections">
            {GROUP_MOBILE_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`group-mobile-section-tab ${mobileSection === section.id ? "is-active" : ""}`.trim()}
                aria-pressed={mobileSection === section.id}
                onClick={() => setMobileSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        ) : null}

        {showBalanceDiagnostics && balanceDiagnostics.rows.length ? (
          <section className={`group-diagnostics ${balanceDiagnostics.hasMismatch ? "has-mismatch" : "is-clean"}`.trim()}>
            <div className="group-diagnostics-head">
              <strong>Balance Diagnostics</strong>
              <span>
                {balanceDiagnostics.hasMismatch
                  ? "Potential mismatch: API net and unsettled-only net differ."
                  : "No mismatch detected: API net aligns with unsettled-only net."}
              </span>
            </div>
            <div className="group-diagnostics-grid" role="table" aria-label="Balance diagnostics">
              <p className="group-diagnostics-header" role="row">
                <span role="columnheader">Member</span>
                <span role="columnheader">API Net</span>
                <span role="columnheader">Unsettled Net</span>
                <span role="columnheader">Delta</span>
              </p>
              {balanceDiagnostics.rows.map((row) => (
                <p key={row.memberId} className={`group-diagnostics-row ${row.deltaCents !== 0 ? "is-mismatch" : ""}`.trim()} role="row">
                  <span role="cell">{row.name}</span>
                  <span role="cell">{formatMoney(row.apiNetCents / 100)}</span>
                  <span role="cell">{formatMoney(row.unsettledNetCents / 100)}</span>
                  <span role="cell">{formatMoney(row.deltaCents / 100)}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {groupError ? <p className="alert">{groupError}</p> : null}

        {groupLoading ? (
          <section className="card panel section-panel">Loading group details...</section>
        ) : (
          <div className="group-grid">
            <motion.article
              className={`card panel section-panel group-mobile-panel ${mobileSection === "members" ? "is-active" : ""}`.trim()}
              data-mobile-panel="members"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
            >
              <div className="group-members-panel-copy">
                <h3>Group Members</h3>
              </div>
              {displayMembers.length ? (
                <motion.ul
                  className="member-list"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {displayMembers.map((member, index) => {
                    const isOwnerMember = member?.role === "OWNER"
                      || (Boolean(detailsGroupInfo?.createdBy) && member?.id === detailsGroupInfo.createdBy);
                    return (
                    <motion.li
                      key={member.id || `${member.name}-${index}`}
                      className="member-motion-item"
                      variants={itemVariants}
                      whileHover={{ y: -2, scale: 1.005 }}
                      transition={{ duration: 0.16 }}
                    >
                      <MemberCardItem member={member} isOwner={isOwnerMember} />
                    </motion.li>
                    );
                  })}
                </motion.ul>
              ) : (
                <p className="list-empty">No members found for this group yet.</p>
              )}

              <div className="group-members-manage">
                <div className="group-members-manage-head">
                  <div>
                    <h4>Add Someone</h4>
                  </div>
                </div>

                <form className="group-invite-inline-form" onSubmit={handleCreateGroupInvite}>
                  <div className="group-invite-inline-fields">
                    <div className="field group-invite-inline-field">
                      <label className="sr-only" htmlFor="groupInviteName">Name</label>
                      <input
                        id="groupInviteName"
                        type="text"
                        value={inviteFriendName}
                        onChange={(event) => setInviteFriendName(event.target.value)}
                        placeholder="Name"
                        maxLength={120}
                        required
                      />
                    </div>

                    <div className="field group-invite-inline-field">
                      <label className="sr-only" htmlFor="groupInviteEmail">Email</label>
                      <input
                        id="groupInviteEmail"
                        type="email"
                        value={inviteFriendEmail}
                        onChange={(event) => setInviteFriendEmail(event.target.value)}
                        placeholder="Email"
                        required
                      />
                    </div>
                  </div>

                  <div className="group-invite-inline-actions">
                    <button type="submit" className="btn-primary" disabled={busy}>
                      Add person
                    </button>
                    <button
                      type="button"
                      className="btn-ghost group-invite-inline-clear"
                      onClick={clearInviteDraft}
                      disabled={busy || (!inviteFriendName && !inviteFriendEmail)}
                      aria-label="Clear invite draft"
                      title="Clear invite draft"
                    >
                      Clear
                    </button>
                  </div>
                </form>

                <div className="group-invite-list-wrap">
                  <h4>Pending for this group</h4>
                  <ul className="list dashboard-invite-list">
                    {groupSentInvites.map((invite) => (
                      <DashboardSentInviteCard
                        key={invite.id}
                        groupName={invite.groupName}
                        recipientName={invite.recipientName}
                        recipientEmail={invite.sentToEmail}
                        expiresAt={invite.expiresAt}
                        onDelete={() => onDeleteInvite(invite)}
                        onRefresh={() => onRefreshInvite(invite)}
                        highlighted={inviteResult?.token === invite.token}
                      />
                    ))}
                    {!groupSentInvites.length ? (
                      <li className="list-empty friend-empty-state">No pending invites for this group yet.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            </motion.article>

            <div className="group-stack">
              <motion.article
                className={`card panel section-panel group-mobile-panel ${mobileSection === "expenses" ? "is-active" : ""}`.trim()}
                data-mobile-panel="expenses"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.08, ease: "easeOut" }}
              >
                <h3>Recent Expenses</h3>
                {unsettledExpenses.length ? (
                  <motion.ul
                    className="expense-list"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {unsettledExpenses.map((expense, index) => (
                      <motion.li
                        key={expense.id || `${expense.description}-${index}`}
                        className="expense-card"
                        variants={itemVariants}
                        layout
                        whileHover={{ y: -2, scale: 1.005 }}
                        transition={{ duration: 0.16 }}
                      >
                        <ExpenseCardItem
                          expense={expense}
                          currentUserId={currentId}
                          currentUserName={currentName}
                          onDeleteExpense={onDeleteExpense}
                          deleteDisabled={
                            busy
                            || groupLoading
                            || !expense.id
                            || !expense.payerUserId
                            || Boolean(expense.settlementId)
                            || settledExpenseIdSet.has(expense.id)
                            || expense.payerUserId !== currentId
                          }
                          deleteTitle={
                            expense.settlementId || settledExpenseIdSet.has(expense.id)
                              ? "Settled expenses cannot be deleted"
                              : expense.payerUserId === currentId
                              ? "Delete this expense"
                              : "Only the expense owner can delete this expense"
                          }
                        />
                      </motion.li>
                    ))}
                  </motion.ul>
                ) : (
                  <p className="list-empty">No unsettled expenses.</p>
                )}
              </motion.article>

              <motion.article
                className={`card panel section-panel group-mobile-panel ${mobileSection === "settled" ? "is-active" : ""}`.trim()}
                data-mobile-panel="settled"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
              >
                <h3>Settled Expense Groups</h3>
                {settledExpenseGroups.length ? (
                  <ul className="settled-group-list">
                    {settledExpenseGroups.map((group) => {
                      const settlement = settlementMap.get(group.settlementId);
                      const isCollapsed = collapsedSettlementIds[group.settlementId] !== false;
                      return (
                        <li key={group.settlementId} className="settled-group-card">
                          <button
                            type="button"
                            className="settled-group-toggle"
                            onClick={() => toggleSettlement(group.settlementId)}
                            aria-expanded={!isCollapsed}
                            aria-controls={`settlement-group-${group.settlementId}`}
                          >
                            <div className="settled-group-main">
                              <p className="settled-group-title">
                                <strong>{settlement?.fromUserName || "Member"}</strong>
                                <span className="settled-group-separator">settled with</span>
                                <strong>{settlement?.toUserName || "Member"}</strong>
                              </p>
                              <p className="settled-group-meta">
                                Amount: {formatMoney((settlement?.amountCents || group.totalCents) / 100)}
                                {" | "}Settled: {formatDate(settlement?.settledAt)}
                                {" | "}Expenses: {group.expenses.length}
                              </p>
                            </div>
                            <span className="settled-toggle-pill">{isCollapsed ? "Expand" : "Collapse"}</span>
                          </button>

                          {!isCollapsed ? (
                            <div id={`settlement-group-${group.settlementId}`} className="settled-group-body">
                              <ul className="expense-list settled-expense-list">
                                {group.expenses.map((expense) => (
                                  <li key={expense.id} className="expense-card expense-card-no-delete">
                                    <ExpenseCardItem
                                      expense={expense}
                                      currentUserId={currentId}
                                      currentUserName={currentName}
                                      showDeleteButton={false}
                                    />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="list-empty">No settled expenses yet.</p>
                )}
              </motion.article>
            </div>
          </div>
        )}
      </article>

      <SettleUpModal
        isOpen={isSettleUpModalOpen}
        onClose={onCloseSettleUpModal}
        currentUserId={currentId}
        currentUserName={currentName}
        members={displayMembers}
        expenses={unsettledExpenses}
        settlementSuggestions={settlementSuggestions}
        groupName={detailsGroupInfo?.name || displayedGroup?.name || "Group"}
        onSaveSettlement={onCreateSettlement}
      />

      <LeaveGroupModal
        isOpen={Boolean(isLeaveGroupModalOpen)}
        onClose={onCancelLeaveGroup}
        onConfirm={onConfirmLeaveGroup}
        groupName={detailsGroupInfo?.name || displayedGroup?.name || "Group"}
        currentUserUnsettledNetCents={currentUserUnsettledNetCents}
        busy={busy}
      />
    </section>
  );
}

