import { describe, expect, it } from "vitest";
import { normalizeExpenses } from "../expenseModel";

describe("normalizeExpenses", () => {
  it("treats zero-guid settlement ids as unsettled", () => {
    const expenses = normalizeExpenses({
      expenses: [{
        id: "expense-1",
        description: "Taxi",
        amountCents: 2500,
        settlementId: "00000000-0000-0000-0000-000000000000",
        isSettled: true
      }]
    }, []);

    expect(expenses[0].settlementId).toBeNull();
    expect(expenses[0].isSettled).toBe(false);
  });

  it("normalizes reversalOfExpenseId from API fields", () => {
    const expenses = normalizeExpenses({
      expenses: [{
        id: "expense-1",
        description: "Reversal: Taxi",
        amountCents: -2500,
        reversalOfExpenseId: "expense-0"
      }]
    }, []);

    expect(expenses[0].reversalOfExpenseId).toBe("expense-0");
  });
});
