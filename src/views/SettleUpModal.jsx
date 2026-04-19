import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney, initials } from "../utils/formatters";

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

// Returns members the current user owes (they appear as toUserId in a
// suggestion from currentUser)
function membersCurrentUserOwes(currentUserId, members, suggestions) {
  const ids = new Set(
    (suggestions || [])
      .filter((s) => s?.fromUserId === currentUserId && s?.toUserId !== currentUserId)
      .map((s) => s.toUserId)
  );
  return (members || []).filter((m) => ids.has(m?.id));
}

// Returns members who owe the current user (they appear as fromUserId toward
// currentUser)
function membersWhoOweCurrentUser(currentUserId, members, suggestions) {
  const ids = new Set(
    (suggestions || [])
      .filter((s) => s?.toUserId === currentUserId && s?.fromUserId !== currentUserId)
      .map((s) => s.fromUserId)
  );
  return (members || []).filter((m) => ids.has(m?.id));
}

export default function SettleUpModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  members,
  settlementSuggestions,
  onSaveSettlement,
  groupName
}) {
  // "paying" = I am paying someone | "received" = someone paid me
  const [perspective, setPerspective] = useState("paying");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [settlementDate, setSettlementDate] = useState(todayIsoDate());
  const maxSettlementDate = useMemo(() => todayIsoDate(), []);

  const safeMembers = useMemo(() => (Array.isArray(members) ? members : []), [members]);
  const safeSuggestions = useMemo(
    () => (Array.isArray(settlementSuggestions) ? settlementSuggestions : []),
    [settlementSuggestions]
  );

  // Derive fromUserId / toUserId from perspective
  const fromUserId = perspective === "paying" ? currentUserId : selectedMemberId;
  const toUserId = perspective === "paying" ? selectedMemberId : currentUserId;

  const suggestionAmountByPair = useMemo(() => {
    const map = new Map();
    for (const s of safeSuggestions) {
      const key = pairKey(s?.fromUserId, s?.toUserId);
      if (!key) continue;
      map.set(key, s?.amountCents || 0);
    }
    return map;
  }, [safeSuggestions]);

  const expectedAmountCents = useMemo(
    () => suggestionAmountByPair.get(pairKey(fromUserId, toUserId)) ?? 0,
    [suggestionAmountByPair, fromUserId, toUserId]
  );

  const eligibleMembers = useMemo(() => {
    if (perspective === "paying") {
      return membersCurrentUserOwes(currentUserId, safeMembers, safeSuggestions);
    }
    return membersWhoOweCurrentUser(currentUserId, safeMembers, safeSuggestions);
  }, [perspective, currentUserId, safeMembers, safeSuggestions]);

  const selectedMember = safeMembers.find((m) => m?.id === selectedMemberId) || null;

  const noSuggestion = selectedMemberId !== "" && expectedAmountCents === 0;

  // Reset on close
  useEffect(() => {
    if (isOpen) return;
    setPerspective("paying");
    setSelectedMemberId("");
    setLocalError("");
    setSaving(false);
    setSettlementDate(todayIsoDate());
  }, [isOpen]);

  // Set perspective automatically when modal opens:
  // default to "paying" if the current user owes anyone, otherwise "received"
  useEffect(() => {
    if (!isOpen) return;
    const owes = membersCurrentUserOwes(currentUserId, safeMembers, safeSuggestions);
    setPerspective(owes.length > 0 ? "paying" : "received");
  }, [isOpen, currentUserId, safeMembers, safeSuggestions]);

  // Auto-select best member on open or perspective change
  useEffect(() => {
    if (!isOpen) return;
    const best = eligibleMembers[0]?.id || "";
    setSelectedMemberId(best);
    setLocalError("");
  }, [isOpen, perspective, eligibleMembers]);

  const handleSave = async () => {
    if (!selectedMemberId) {
      setLocalError("Select who you are settling with.");
      return;
    }
    if (fromUserId === toUserId) {
      setLocalError("Payer and receiver must be different members.");
      return;
    }
    if (!Number.isFinite(expectedAmountCents) || expectedAmountCents <= 0) {
      setLocalError("No outstanding balance found for this pair.");
      return;
    }
    if (noSuggestion) {
      setLocalError("No outstanding balance found for this pair.");
      return;
    }
    if (!settlementDate) {
      setLocalError("Settlement date is required.");
      return;
    }

    setLocalError("");
    setSaving(true);
    try {
      const result = await onSaveSettlement({
        fromUserId,
        toUserId,
        amountCents: expectedAmountCents,
        note: null,
        settledAt: toIsoLocalDateTime(settlementDate),
        recordedByPayee: perspective === "received"
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

  const fromName = perspective === "paying"
    ? (currentUserName || "You")
    : (selectedMember?.name || "…");
  const toName = perspective === "paying"
    ? (selectedMember?.name || "…")
    : (currentUserName || "You");

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
                {groupName ? (
                  <div className="settlement-group-pill" style={{ marginTop: 6 }}>
                    {groupName}
                  </div>
                ) : null}
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

                {/* Perspective toggle */}
                <div className="settle-perspective-toggle" role="group" aria-label="Settlement perspective">
                  <button
                    type="button"
                    className={`settle-perspective-btn${perspective === "paying" ? " is-active" : ""}`}
                    onClick={() => setPerspective("paying")}
                    aria-pressed={perspective === "paying"}
                  >
                    I&apos;m paying
                  </button>
                  <button
                    type="button"
                    className={`settle-perspective-btn${perspective === "received" ? " is-active" : ""}`}
                    onClick={() => setPerspective("received")}
                    aria-pressed={perspective === "received"}
                  >
                    I received
                  </button>
                </div>

                {/* Member chip selector */}
                {eligibleMembers.length > 0 ? (
                  <div className="settle-member-chips" role="listbox" aria-label="Select member">
                    {eligibleMembers.map((member) => {
                      const key = perspective === "paying"
                        ? pairKey(currentUserId, member.id)
                        : pairKey(member.id, currentUserId);
                      const amt = suggestionAmountByPair.get(key) ?? 0;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          role="option"
                          aria-selected={selectedMemberId === member.id}
                          className={`settle-member-chip${selectedMemberId === member.id ? " is-selected" : ""}`}
                          onClick={() => setSelectedMemberId(member.id)}
                        >
                          <div className="settle-chip-avatar">{initials(member.name)}</div>
                          <span>{member.name}</span>
                          {amt > 0 ? (
                            <span className="settle-chip-balance">{formatMoney(amt / 100)}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="alert" style={{ marginBottom: 14 }}>
                    {perspective === "paying"
                      ? "You have no outstanding amounts to pay."
                      : "No one owes you in this group."}
                  </p>
                )}

                {/* Direction pill */}
                {selectedMemberId && !noSuggestion ? (
                  <div className="settle-direction-pill" aria-label="Payment direction">
                    {fromName} &rarr; {toName}
                  </div>
                ) : null}

                {/* Amount — locked to full suggestion, read-only */}
                {expectedAmountCents > 0 ? (
                  <div className="settlement-amount-wrap">
                    <span className="settlement-currency">$</span>
                    <span
                      className="settlement-amount-input"
                      style={{ display: "inline-flex", alignItems: "baseline", justifyContent: "center" }}
                      aria-label="Settlement amount"
                    >
                      {(expectedAmountCents / 100).toFixed(2)}
                    </span>
                  </div>
                ) : null}

                {/* Date */}
                <div className="settlement-meta-grid">
                  <input
                    type="date"
                    className="settlement-pill-input"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    max={maxSettlementDate}
                    aria-label="Settlement date"
                  />
                </div>

                {localError ? <p className="alert" style={{ marginTop: 10 }}>{localError}</p> : null}
              </div>
            </div>

            <div className="actions modal-actions settle-up-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <motion.button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || eligibleMembers.length === 0}
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
