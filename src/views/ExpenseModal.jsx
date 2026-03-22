import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlerts } from "../contexts/AlertContext";
import { formatDate, formatMoney } from "../utils/formatters";

export default function ExpenseModal({
  isOpen,
  expenseDescription,
  expenseAmount,
  expensePayerUserId,
  expenseSavedStatus,
  participantCount,
  members,
  groupLoading,
  selectedGroupId,
  expenseDescriptionRef,
  expenseAmountRef,
  onClose,
  onCreateExpense,
  onExpenseDescriptionKeyDown,
  setExpenseDescription,
  setExpenseAmount,
  setExpensePayerUserId
}) {
  const { busy } = useAlerts();
  const [isPayerMenuOpen, setIsPayerMenuOpen] = useState(false);
  const payerMenuRef = useRef(null);
  const amountValue = Number(expenseAmount) || 0;
  const safeParticipantCount = Math.max(1, participantCount || 1);
  const splitPerPerson = amountValue > 0 ? amountValue / safeParticipantCount : 0;
  const payerOptions = useMemo(() => members || [], [members]);
  const payerName = useMemo(
    () => payerOptions.find((member) => member.id === expensePayerUserId)?.name || "Select member",
    [payerOptions, expensePayerUserId]
  );

  useEffect(() => {
    if (!isPayerMenuOpen) return undefined;

    function onPointerDown(event) {
      if (!payerMenuRef.current || payerMenuRef.current.contains(event.target)) return;
      setIsPayerMenuOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isPayerMenuOpen]);

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
              <div>
                <h3 id="addExpenseModalTitle">Add expense</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close add expense popup"
              >
                &times;
              </button>
            </div>
            <form onSubmit={onCreateExpense}>
              <div className="expense-entry-layout">
                <div className="expense-icon-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M6 3.5h12v17H6v-17Zm1.5 1.5v14h9v-14h-9Z" />
                    <path d="M9.5 9.8h5v1.4h-5zM9.5 13h5v1.4h-5z" />
                    <path d="M7.4 18.2 12 15.7l4.6 2.5v1.6L12 17.3l-4.6 2.5z" />
                  </svg>
                </div>
                <div className="field expense-description-field">
                  <label htmlFor="expenseDescription">Description</label>
                  <input
                    ref={expenseDescriptionRef}
                    id="expenseDescription"
                    type="text"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    onKeyDown={onExpenseDescriptionKeyDown}
                    placeholder="Dinner, groceries, uber..."
                    maxLength={200}
                    required
                  />
                </div>
              </div>
              <div className="field expense-amount-field">
                <label htmlFor="expenseAmount">Amount</label>
                <input
                  ref={expenseAmountRef}
                  id="expenseAmount"
                  name="expenseAmount"
                  type="number"
                  min="0.01"
                  step={0.01}
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  onBlur={(e) => {
                    const raw = e.target.value;
                    if (!raw) return;
                    const parsed = Number(raw);
                    if (!Number.isFinite(parsed) || parsed <= 0) return;
                    setExpenseAmount(parsed.toFixed(2));
                  }}
                  placeholder="0.00"
                  autoComplete="off"
                  required
                />
              </div>
              <p className="expense-amount-hint">Tip: use arrow keys to increment by cents.</p>
              <div className="expense-inline-summary" aria-live="polite">
                <div className="expense-split-summary">
                  <p>
                    Paid by{" "}
                    <span className="summary-chip-wrap" ref={payerMenuRef}>
                      <button
                        type="button"
                        className="summary-chip summary-chip-button"
                        onClick={() => setIsPayerMenuOpen((prev) => !prev)}
                        aria-haspopup="listbox"
                        aria-expanded={isPayerMenuOpen}
                      >
                        {payerName}
                      </button>
                      {isPayerMenuOpen ? (
                        <span className="summary-chip-menu" role="listbox" aria-label="Select payer">
                          {payerOptions.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              role="option"
                              aria-selected={member.id === expensePayerUserId}
                              className="summary-chip-option"
                              onClick={() => {
                                setExpensePayerUserId(member.id);
                                setIsPayerMenuOpen(false);
                              }}
                            >
                              {member.name}
                            </button>
                          ))}
                        </span>
                      ) : null}
                    </span>{" "}
                    and split <span className="summary-chip">equally</span>
                  </p>
                  <p>
                    ({formatMoney(splitPerPerson)}/person across {safeParticipantCount} member
                    {safeParticipantCount === 1 ? "" : "s"}) • {formatDate(new Date().toISOString())}
                  </p>
                </div>
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
