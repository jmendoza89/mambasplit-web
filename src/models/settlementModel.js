export function normalizeSettlements(group) {
  if (!group) return [];
  const rawSettlements = group.settlements || [];

  return rawSettlements.map((settlement, index) => ({
    id: settlement.id || `settlement-${index}`,
    groupId: settlement.groupId || group.group?.id || group.id || null,
    fromUserId: settlement.fromUserId || null,
    fromUserName: settlement.fromUserName || "Unknown",
    toUserId: settlement.toUserId || null,
    toUserName: settlement.toUserName || "Unknown",
    amountCents: typeof settlement.amountCents === "number" ? settlement.amountCents : 0,
    note: settlement.note || null,
    settledAt: settlement.settledAt || null,
    expenseIds: Array.isArray(settlement.expenseIds) ? settlement.expenseIds : []
  }));
}

export function normalizeSettlementSuggestions(group) {
  if (!group) return [];
  const rawSuggestions = group.settlementSuggestions || [];

  return rawSuggestions.map((suggestion, index) => ({
    id: `${suggestion.fromUserId || "unknown"}-${suggestion.toUserId || "unknown"}-${index}`,
    fromUserId: suggestion.fromUserId || null,
    fromUserName: suggestion.fromUserName || "Unknown",
    toUserId: suggestion.toUserId || null,
    toUserName: suggestion.toUserName || "Unknown",
    amountCents: typeof suggestion.amountCents === "number" ? suggestion.amountCents : 0
  }));
}
