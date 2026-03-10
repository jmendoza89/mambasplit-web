import { isUuid } from "../utils/formatters";
import { isValidExpenseAmount as validateAmount } from "../utils/validation";

function normalizeSettlementId(rawSettlementId) {
  if (typeof rawSettlementId !== "string") return null;
  const trimmed = rawSettlementId.trim();
  if (!trimmed) return null;
  if (trimmed === "00000000-0000-0000-0000-000000000000") return null;
  return trimmed;
}

export function normalizeExpenses(group, members) {
  if (!group) return [];
  const rawExpenses = group.expenses || group.items || group.transactions || [];
  const memberMap = new Map((members || []).map((member) => [member.id, member]));

  return rawExpenses.map((expense, index) => {
    const payerUserId = expense.payerUserId || expense.payer?.id || null;
    const payerMember = payerUserId ? memberMap.get(payerUserId) : null;
    const settlementId = normalizeSettlementId(expense.settlementId);
    const hasValidSettlementId = Boolean(settlementId);
    const explicitSettledWithoutSettlementId = expense.isSettled === true
      && (expense.settlementId === null || expense.settlementId === undefined || expense.settlementId === "");

    return {
      id: expense.id || `expense-${index}`,
      description: expense.description || expense.title || "Expense",
      amount:
        expense.amount ??
        (typeof expense.amountCents === "number" ? expense.amountCents / 100 : expense.amountCents),
      amountCents: typeof expense.amountCents === "number"
        ? expense.amountCents
        : Math.round((Number(expense.amount) || 0) * 100),
      currency: expense.currency || "USD",
      payerUserId,
      paidBy:
        expense.paidBy ||
        expense.payerName ||
        payerMember?.name ||
        expense.payer?.displayName ||
        "Unknown",
      createdAt: expense.createdAt || expense.date || null,
      reversalOfExpenseId: expense.reversalOfExpenseId || expense.reversalOfId || null,
      settlementId,
      isSettled: hasValidSettlementId || explicitSettledWithoutSettlementId,
      splits: (expense.splits || []).map((split) => {
        const member = memberMap.get(split.userId);
        return {
          ...split,
          userDisplayName: member?.name || split.userId
        };
      })
    };
  });
}

export function buildExpenseParticipants(groupMembers, payerId) {
  const ids = groupMembers.map((member) => member.id).filter(isUuid);
  if (!ids.includes(payerId)) ids.push(payerId);
  return Array.from(new Set(ids));
}

export function isValidExpenseAmount(amountText) {
  return validateAmount(amountText);
}
