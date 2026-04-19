import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { formatMoney } from "../utils/formatters";

export default function LeaveGroupModal({
  isOpen,
  onClose,
  onConfirm,
  groupName,
  currentUserUnsettledNetCents,
  busy
}) {
  const [confirming, setConfirming] = useState(false);
  const owedCents = Math.max(0, -(currentUserUnsettledNetCents || 0));
  const hasDebt = owedCents > 0;
  const isDisabled = confirming || Boolean(busy);

  async function handleConfirm() {
    if (isDisabled) return;
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  }

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
            aria-labelledby="leaveGroupModalTitle"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="modal-header">
              <div>
                <h3 id="leaveGroupModalTitle">Leave Group?</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close leave group dialog"
                disabled={isDisabled}
              >
                &times;
              </button>
            </div>

            <div className="leave-group-content">
              <p>
                {hasDebt
                  ? `You currently owe ${formatMoney(owedCents / 100)} in unsettled expenses.`
                  : "You do not currently owe anything in unsettled expenses."}
              </p>
              {hasDebt ? (
                <p>
                  If you leave this group, unsettled expenses will be rebalanced across the remaining members.
                </p>
              ) : null}
              <p>
                Are you sure you want to leave <strong>{groupName || "this group"}</strong>?
              </p>
            </div>

            <div className="actions modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
                disabled={isDisabled}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirm}
                disabled={isDisabled}
              >
                {confirming ? "Leaving..." : "Leave Group"}
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
