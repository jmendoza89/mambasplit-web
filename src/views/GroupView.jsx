import { motion } from "motion/react";
import { formatDate, formatMoney, initials } from "../utils/formatters";

export default function GroupView({
  selectedGroupId,
  currentId,
  busy,
  groupLoading,
  isGroupOwner,
  displayedGroup,
  detailsGroupInfo,
  detailsMe,
  effectiveMemberCount,
  expenseCount,
  totalExpense,
  effectiveMyRole,
  groupError,
  displayMembers,
  expenses,
  listVariants,
  itemVariants,
  onBackToDashboard,
  onOpenExpenseModal,
  onDeleteExpense,
  onRefreshGroupDetail,
  onDeleteGroup,
  onLogout
}) {
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
                {expenses.length ? (
                  <motion.ul
                    className="expense-list"
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {expenses.map((expense, index) => (
                      <motion.li
                        key={expense.id || `${expense.description}-${index}`}
                        variants={itemVariants}
                        layout
                        whileHover={{ y: -2, scale: 1.005 }}
                        transition={{ duration: 0.16 }}
                      >
                        <div>
                          <strong>{expense.description || "Expense"}</strong>
                          <p>
                            Paid by {expense.paidBy || "Unknown"}
                            {expense.createdAt ? ` | ${formatDate(expense.createdAt)}` : ""}
                          </p>
                          {expense.splits?.length ? (
                            <p>
                              Split: {expense.splits.map((split) => (
                                `${split.userDisplayName}: ${formatMoney((split.amountOwedCents || 0) / 100)}`
                              )).join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="expense-actions">
                          <span>{formatMoney(expense.amount, expense.currency)}</span>
                          <button
                            className="btn-danger btn-inline"
                            type="button"
                            onClick={() => onDeleteExpense(expense.id)}
                            disabled={
                              busy
                              || groupLoading
                              || !expense.id
                              || !expense.payerUserId
                              || expense.payerUserId !== currentId
                            }
                            title={
                              expense.payerUserId === currentId
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
                  <p className="list-empty">No expenses yet. Use Add Expense to create the first one.</p>
                )}
              </motion.article>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
