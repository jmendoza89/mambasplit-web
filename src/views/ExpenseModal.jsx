import { AnimatePresence, motion } from "motion/react";
import { useAlerts } from "../contexts/AlertContext";
import { formatDate, formatMoney } from "../utils/formatters";

export default function ExpenseModal({
  isOpen,
  expenseDescription,
  expenseAmount,
  expenseSavedStatus,
  groupLoading,
  selectedGroupId,
  expenseDescriptionRef,
  expenseAmountRef,
  onClose,
  onCreateExpense,
  onExpenseDescriptionKeyDown,
  setExpenseDescription,
  setExpenseAmount
}) {
  const { busy } = useAlerts();
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="addExpenseModalTitle"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="modal-header">
              <h3 id="addExpenseModalTitle">Add an expense</h3>
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close add expense popup"
              >
                x
              </button>
            </div>
            <form onSubmit={onCreateExpense}>
              <div className="field">
                <label htmlFor="expenseDescription">Description</label>
                <input
                  ref={expenseDescriptionRef}
                  id="expenseDescription"
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  onKeyDown={onExpenseDescriptionKeyDown}
                  placeholder="Dinner, groceries, taxi..."
                  maxLength={200}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="expenseAmount">Amount</label>
                <input
                  ref={expenseAmountRef}
                  id="expenseAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </div>
              <AnimatePresence mode="wait">
                {expenseSavedStatus ? (
                  <motion.p
                    className="expense-save-status"
                    aria-live="polite"
                    key={expenseSavedStatus.savedAt}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    Saved: {expenseSavedStatus.description} ({formatMoney(expenseSavedStatus.amount)}) at{" "}
                    {formatDate(expenseSavedStatus.savedAt)}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <div className="actions modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onClose}
                  disabled={busy}
                >
                  Close
                </button>
                <motion.button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || groupLoading || !selectedGroupId}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {busy ? "Saving..." : "Save"}
                </motion.button>
              </div>
            </form>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
