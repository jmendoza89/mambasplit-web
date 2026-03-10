import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, formatMoney, initials } from "../utils/formatters";
import SettleUpModal from "./SettleUpModal";

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
  onBackToDashboard,
  onOpenExpenseModal,
  onOpenSettleUpModal,
  onCloseSettleUpModal,
  onCreateSettlement,
  isSettleUpModalOpen,
  onDeleteExpense,
  onRefreshGroupDetail,
  onDeleteGroup
}) {
  const { currentId, currentName, onLogout } = useAuth();
  const { busy } = useAlerts();
  const [collapsedSettlementIds, setCollapsedSettlementIds] = useState({});
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

  return (
    <section className="dash-wrap">
      <article className="card panel">
        <div className="group-page-top">
          <button className="btn-ghost" type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
          <div className="dash-top-actions">
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
            <button
              className="btn-secondary"
              type="button"
              onClick={onRefreshGroupDetail}
              disabled={!selectedGroupId || groupLoading}
            >
              {groupLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="btn-danger"
              type="button"
              onClick={onDeleteGroup}
              disabled={busy || groupLoading || !selectedGroupId || !isGroupOwner}
              title={isGroupOwner ? "Delete this group" : "Only the group owner can delete this group"}
            >
              Delete Group
            </button>
            <button className="btn-ghost" type="button" onClick={onLogout} disabled={busy}>
              Logout
            </button>
          </div>
        </div>

        <motion.div
          className="group-hero"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          <h2>{detailsGroupInfo?.name || displayedGroup?.name || "Group"}</h2>
          <p>Track members and expenses in one place.</p>
          <div className="chip-row">
            <span className="chip chip-soft">ID: {detailsGroupInfo?.id || selectedGroupId || "-"}</span>
            <span className="chip chip-soft">Members: {effectiveMemberCount}</span>
            <span className="chip chip-soft">Expenses: {expenseCount}</span>
            <span className="chip chip-soft">Total: {formatMoney(totalExpense)}</span>
            <span className="chip chip-soft">Settlements: {settlementCount}</span>
            <span className="chip chip-soft">Settled: {formatMoney(totalSettlementAmount)}</span>
            <span className="chip chip-soft">My Role: {effectiveMyRole}</span>
            <span className="chip chip-soft">My Net: {formatMoney((detailsMe?.netBalanceCents || 0) / 100)}</span>
          </div>
          <div className="chip-row">
            <span className="chip chip-soft">Created: {formatDate(detailsGroupInfo?.createdAt)}</span>
            <span className="chip chip-soft">Owner ID: {detailsGroupInfo?.createdBy || "-"}</span>
          </div>
        </motion.div>

        {groupError ? <p className="alert">{groupError}</p> : null}

        {groupLoading ? (
          <section className="card panel section-panel">Loading group details...</section>
        ) : (
          <div className="group-grid">
            <motion.article
              className="card panel section-panel"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
            >
              <h3>Members</h3>
              {displayMembers.length ? (
                <motion.ul
                  className="member-list"
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {displayMembers.map((member, index) => (
                    <motion.li
                      key={member.id || `${member.name}-${index}`}
                      variants={itemVariants}
                      whileHover={{ y: -2, scale: 1.005 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="avatar">{initials(member.name)}</div>
                      <div>
                        <strong>{member.name}</strong>
                        <p>{member.email || "No email on record"}</p>
                        <p>
                          {member.role || "MEMBER"}
                          {member.joinedAt ? ` | Joined ${formatDate(member.joinedAt)}` : ""}
                          {typeof member.netBalanceCents === "number"
                            ? ` | Net ${formatMoney(member.netBalanceCents / 100)}`
                            : ""}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              ) : (
                <p className="list-empty">No members found for this group yet.</p>
              )}
            </motion.article>

            <div className="group-stack">
              <motion.article
                className="card panel section-panel"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
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
                        <div className="expense-main">
                          <strong className="expense-title">{expense.description || "Expense"}</strong>
                          <p className="expense-meta">
                            Paid by {expense.paidBy || "Unknown"}
                            {expense.createdAt ? ` | ${formatDate(expense.createdAt)}` : ""}
                          </p>
                          {expense.splits?.length ? (
                            <p className="expense-split">
                              Split: {expense.splits.map((split) => (
                                `${split.userDisplayName}: ${formatMoney((split.amountOwedCents || 0) / 100)}`
                              )).join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="expense-actions">
                          <span className="expense-amount">{formatMoney(expense.amount, expense.currency)}</span>
                          <button
                            className="btn-danger btn-inline expense-delete"
                            type="button"
                            onClick={() => onDeleteExpense(expense.id)}
                            disabled={
                              busy
                              || groupLoading
                              || !expense.id
                              || !expense.payerUserId
                              || Boolean(expense.settlementId)
                              || settledExpenseIdSet.has(expense.id)
                              || expense.payerUserId !== currentId
                            }
                            title={
                              expense.settlementId || settledExpenseIdSet.has(expense.id)
                                ? "Settled expenses cannot be deleted"
                                : expense.payerUserId === currentId
                                ? "Delete this expense"
                                : "Only the expense owner can delete this expense"
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </motion.ul>
                ) : (
                  <p className="list-empty">No unsettled expenses.</p>
                )}
              </motion.article>

              <motion.article
                className="card panel section-panel"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.12, ease: "easeOut" }}
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
                              {group.expenses.map((expense) => (
                                <div key={expense.id} className="settled-group-expense">
                                  <span>{expense.description || "Expense"}</span>
                                  <span>{formatMoney(expense.amount, expense.currency)}</span>
                                  <span>{formatDate(expense.createdAt)}</span>
                                </div>
                              ))}
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
    </section>
  );
}

