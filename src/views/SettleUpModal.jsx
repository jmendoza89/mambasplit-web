import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { initials } from "../utils/formatters";

function todayIsoDate() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoLocalDateTime(dateOnlyText) {
  const date = new Date(`${dateOnlyText}T00:00:00`);
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const minutes = String(absOffset % 60).padStart(2, "0");
  return `${dateOnlyText}T00:00:00${sign}${hours}:${minutes}`;
}

function pairKey(fromUserId, toUserId) {
  return `${fromUserId || ""}->${toUserId || ""}`;
}

function computePairBalanceCents(expenses, fromUserId, toUserId) {
  if (!fromUserId || !toUserId) return 0;

  let netCents = 0;
  for (const expense of expenses || []) {
    const splits = Array.isArray(expense?.splits) ? expense.splits : [];
    if (expense?.payerUserId === toUserId) {
      const owedByFrom = splits
        .filter((split) => split?.userId === fromUserId)
        .reduce((sum, split) => sum + (split?.amountOwedCents || 0), 0);
      netCents += owedByFrom;
    }

    if (expense?.payerUserId === fromUserId) {
      const owedByTo = splits
        .filter((split) => split?.userId === toUserId)
        .reduce((sum, split) => sum + (split?.amountOwedCents || 0), 0);
      netCents -= owedByTo;
    }
  }

  return Math.max(0, netCents);
}

function pickBestReceiverId(currentUserId, members, expenses, suggestions) {
  if (!currentUserId) return "";
  const receiverCandidates = (members || []).filter((member) => member?.id && member.id !== currentUserId);
  if (!receiverCandidates.length) return "";

  let bestReceiverId = "";
  let bestAmount = 0;
  for (const candidate of receiverCandidates) {
    const amountCents = computePairBalanceCents(expenses, currentUserId, candidate.id);
    if (amountCents > bestAmount) {
      bestAmount = amountCents;
      bestReceiverId = candidate.id;
    }
  }

  if (bestReceiverId) return bestReceiverId;

  const suggestionReceiverId = (suggestions || []).find(
    (suggestion) => suggestion?.fromUserId === currentUserId && suggestion?.toUserId && suggestion.toUserId !== currentUserId
  )?.toUserId;
  if (suggestionReceiverId && receiverCandidates.some((member) => member.id === suggestionReceiverId)) {
    return suggestionReceiverId;
  }

  return receiverCandidates[0]?.id || "";
}

export default function SettleUpModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  members,
  expenses,
  settlementSuggestions,
  onSaveSettlement,
  groupName
}) {
  const [cashAmount, setCashAmount] = useState("0.00");
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [settlementDate, setSettlementDate] = useState(todayIsoDate());
  const maxSettlementDate = useMemo(() => todayIsoDate(), []);

  const safeMembers = useMemo(() => (Array.isArray(members) ? members : []), [members]);
  const safeExpenses = useMemo(() => (Array.isArray(expenses) ? expenses : []), [expenses]);
  const safeSuggestions = useMemo(
    () => (Array.isArray(settlementSuggestions) ? settlementSuggestions : []),
    [settlementSuggestions]
  );
  const expenseById = useMemo(
    () => new Map(safeExpenses.map((expense) => [expense.id, expense])),
    [safeExpenses]
  );
  const autoSelectedExpenseIds = useMemo(
    () => safeExpenses.map((expense) => expense.id).filter(Boolean),
    [safeExpenses]
  );
  const autoSelectedExpenseTotalCents = useMemo(
    () => autoSelectedExpenseIds.reduce((sum, expenseId) => (
      sum + (expenseById.get(expenseId)?.amountCents || 0)
    ), 0),
    [autoSelectedExpenseIds, expenseById]
  );
  const suggestionAmountByPair = useMemo(() => {
    const map = new Map();
    for (const suggestion of safeSuggestions) {
      const key = pairKey(suggestion?.fromUserId, suggestion?.toUserId);
      if (!key) continue;
      map.set(key, suggestion?.amountCents || 0);
    }
    return map;
  }, [safeSuggestions]);
  const expectedPairAmountCents = useMemo(() => {
    const computedFromExpenses = computePairBalanceCents(safeExpenses, fromUserId, toUserId);
    if (computedFromExpenses > 0) {
      return computedFromExpenses;
    }
    const fromToSuggestion = suggestionAmountByPair.get(pairKey(fromUserId, toUserId));
    if (typeof fromToSuggestion === "number" && fromToSuggestion > 0) {
      return fromToSuggestion;
    }
    return Math.max(0, autoSelectedExpenseTotalCents);
  }, [suggestionAmountByPair, fromUserId, toUserId, safeExpenses, autoSelectedExpenseTotalCents]);
  const selectedFromMember = safeMembers.find((member) => member.id === fromUserId) || null;
  const selectedToMember = safeMembers.find((member) => member.id === toUserId) || null;

  useEffect(() => {
    if (isOpen) return;
    setCashAmount("0.00");
    setFromUserId("");
    setToUserId("");
    setLocalError("");
    setSaving(false);
    setSettlementDate(todayIsoDate());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const resolvedToUserId = pickBestReceiverId(currentUserId, safeMembers, safeExpenses, safeSuggestions);
    const computedFromExpenses = computePairBalanceCents(safeExpenses, currentUserId, resolvedToUserId);
    const suggestedAmount = suggestionAmountByPair.get(pairKey(currentUserId, resolvedToUserId)) || 0;
    const resolvedAmountCents = computedFromExpenses > 0
      ? computedFromExpenses
      : Math.max(0, suggestedAmount || autoSelectedExpenseTotalCents);
    setFromUserId(currentUserId || "");
    setToUserId(resolvedToUserId);
    setCashAmount((resolvedAmountCents / 100).toFixed(2));
  }, [
    isOpen,
    safeMembers,
    safeSuggestions,
    safeExpenses,
    currentUserId,
    autoSelectedExpenseTotalCents,
    suggestionAmountByPair
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!fromUserId || !toUserId) return;
    setCashAmount((Math.max(0, expectedPairAmountCents) / 100).toFixed(2));
  }, [isOpen, fromUserId, toUserId, expectedPairAmountCents]);

  const handleCashAmountChange = (event) => {
    const nextValue = event.target.value;
    if (!/^\d*(\.\d{0,2})?$/.test(nextValue)) return;
    setCashAmount(nextValue);
  };

  const handleSave = async () => {
    const effectiveFromUserId = currentUserId || "";
    const amountCents = Math.round(Number(cashAmount || "0") * 100);
    if (!effectiveFromUserId) {
      setLocalError("Could not determine current user id for payer.");
      return;
    }

    if (!toUserId) {
      setLocalError("Select both payer and receiver.");
      return;
    }

    if (effectiveFromUserId === toUserId) {
      setLocalError("Payer and receiver must be different members.");
      return;
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setLocalError("Settlement amount must be greater than zero.");
      return;
    }

    if (autoSelectedExpenseIds.length === 0) {
      setLocalError("No unsettled expenses are available to settle.");
      return;
    }

    if (!settlementDate) {
      setLocalError("Settlement date is required.");
      return;
    }

    if (expectedPairAmountCents > 0 && amountCents !== expectedPairAmountCents) {
      setLocalError(
        `Settlement amount (${(amountCents / 100).toFixed(2)}) must match outstanding balance (${(expectedPairAmountCents / 100).toFixed(2)}).`
      );
      return;
    }

    setLocalError("");
    setSaving(true);
    try {
      const result = await onSaveSettlement({
        fromUserId: effectiveFromUserId,
        toUserId,
        amountCents,
        expenseIds: autoSelectedExpenseIds,
        note: null,
        settledAt: toIsoLocalDateTime(settlementDate)
      });

      if (result?.errorMessage) {
        setLocalError(result.errorMessage);
        return;
      }

      if (result) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

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
            className="modal-card settle-up-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settleUpModalTitle"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="modal-header">
              <div>
                <h3 id="settleUpModalTitle">Settle up</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                aria-label="Close settle up popup"
              >
                &times;
              </button>
            </div>

            <div className="settle-up-content">
              <div className="settlement-entry-view">
                <div className="settlement-group-pill settlement-group-pill-top">{groupName || "Group"}</div>

                <div className="settlement-avatar-row">
                  <div className="settlement-avatar">{initials(selectedFromMember?.name || currentUserName || "You")}</div>
                  <span className="settlement-arrow" aria-hidden="true">
                    &#8594;
                  </span>
                  <div className="settlement-avatar">{initials(selectedToMember?.name || "Member")}</div>
                </div>

                <div className="field">
                  <label htmlFor="settlementFromUser">From</label>
                  <select
                    id="settlementFromUser"
                    value={fromUserId}
                    disabled
                  >
                    <option value={currentUserId || ""}>{selectedFromMember?.name || currentUserName || "You"}</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="settlementToUser">To</label>
                  <select
                    id="settlementToUser"
                    value={toUserId}
                    onChange={(event) => setToUserId(event.target.value)}
                  >
                    <option value="">Select receiver</option>
                    {safeMembers.filter((member) => member.id !== (currentUserId || "")).map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>

                <div className="settlement-amount-wrap">
                  <span className="settlement-currency">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="settlement-amount-input"
                    value={cashAmount}
                    onChange={handleCashAmountChange}
                    aria-label="Settlement amount"
                  />
                </div>

                <div className="settlement-meta-grid">
                  <input
                    type="date"
                    className="settlement-pill-input"
                    value={settlementDate}
                    onChange={(event) => setSettlementDate(event.target.value)}
                    max={maxSettlementDate}
                    aria-label="Settlement date"
                  />
                </div>

                {localError ? <p className="alert">{localError}</p> : null}
              </div>
            </div>

            <div className="actions modal-actions settle-up-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={onClose}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                {saving ? "Saving..." : "Save"}
              </motion.button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
