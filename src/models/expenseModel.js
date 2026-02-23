import { isUuid } from "../utils/formatters";

export function normalizeExpenses(group, members) {
  if (!group) return [];
  const rawExpenses = group.expenses || group.items || group.transactions || [];
  const memberMap = new Map((members || []).map((member) => [member.id, member]));

  return rawExpenses.map((expense, index) => {
    const payerUserId = expense.payerUserId || expense.payer?.id || null;
    const payerMember = payerUserId ? memberMap.get(payerUserId) : null;

    return {
      id: expense.id || `expense-${index}`,
      description: expense.description || expense.title || "Expense",
      amount:
        expense.amount ??
        (typeof expense.amountCents === "number" ? expense.amountCents / 100 : expense.amountCents),
      currency: expense.currency || "USD",
      payerUserId,
      paidBy:
        expense.paidBy ||
        expense.payerName ||
        payerMember?.name ||
        expense.payer?.displayName ||
        "Unknown",
      createdAt: expense.createdAt || expense.date || null,
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
  const numericAmount = Number(amountText);
  return Number.isFinite(numericAmount) && numericAmount > 0;
}
