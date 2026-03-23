import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExpenseCardItem from "../ExpenseCardItem";

function renderExpenseCard(overrides = {}) {
  cleanup();

  const expense = {
    id: "expense-1",
    description: "Dinner",
    amountCents: 600,
    currency: "USD",
    payerUserId: "user-1",
    paidBy: "Jordan",
    createdAt: "2026-03-16T12:00:00Z",
    splits: [
      { userId: "user-1", amountOwedCents: 300 },
      { userId: "user-2", amountOwedCents: 300 }
    ],
    ...overrides.expense
  };

  const onDeleteExpense = vi.fn();

  render(
    <ul className="expense-list">
      <li className="expense-card">
        <ExpenseCardItem
          expense={expense}
          currentUserId={overrides.currentUserId || "user-1"}
          currentUserName={overrides.currentUserName || "Jordan"}
          onDeleteExpense={onDeleteExpense}
          deleteDisabled={Boolean(overrides.deleteDisabled)}
          deleteTitle={overrides.deleteTitle || "Delete this expense"}
          showDeleteButton={overrides.showDeleteButton !== false}
        />
      </li>
    </ul>
  );

  return { expense, onDeleteExpense };
}

describe("ExpenseCardItem", () => {
  it("renders only the title in the main content area", () => {
    renderExpenseCard();

    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("does not render legacy secondary text below title", () => {
    renderExpenseCard();

    expect(screen.queryByText(/Paid by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Split:/i)).not.toBeInTheDocument();
  });

  it("renders month and day date stack", () => {
    renderExpenseCard();

    expect(screen.getByText("MAR")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("renders 'you paid' when current user is payer", () => {
    renderExpenseCard({ currentUserId: "user-1" });

    expect(screen.getByText("you paid")).toBeInTheDocument();
  });

  it("renders payer name + 'paid' when another user is payer", () => {
    renderExpenseCard({
      currentUserId: "user-2",
      currentUserName: "Alex",
      expense: { payerUserId: "user-1", paidBy: "Doug R." }
    });

    expect(screen.getByText("Doug R. paid")).toBeInTheDocument();
  });

  it("renders 'you lent' in green when current user paid", () => {
    renderExpenseCard({ currentUserId: "user-1" });

    expect(screen.getByText("you lent")).toBeInTheDocument();
    expect(screen.getByText("$3.00")).toHaveClass("is-positive");
  });

  it("renders 'you owe' in orange when another user paid", () => {
    renderExpenseCard({
      currentUserId: "user-2",
      currentUserName: "Alex",
      expense: { payerUserId: "user-1", paidBy: "Doug R." }
    });

    expect(screen.getByText("you owe")).toBeInTheDocument();
    expect(screen.getByText("$3.00")).toHaveClass("is-negative");
  });

  it("uses a subtle icon-only delete affordance with hover/focus CSS hook classes", () => {
    renderExpenseCard();

    const deleteButton = screen.getByRole("button", { name: "Delete expense" });
    expect(deleteButton).toHaveClass("expense-delete-icon");
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    expect(deleteButton.closest(".expense-card")).toBeInTheDocument();

    deleteButton.focus();
    expect(deleteButton).toHaveFocus();
  });

  it("keeps money formatting as expected", () => {
    renderExpenseCard();

    expect(screen.getByText("$6.00")).toBeInTheDocument();
    expect(screen.getByText("$3.00")).toBeInTheDocument();
  });

  it("can render without delete button for settled rows", () => {
    renderExpenseCard({ showDeleteButton: false });

    expect(screen.queryByRole("button", { name: "Delete expense" })).not.toBeInTheDocument();
  });

  it("prefers explicit payer name when payer id and payer name conflict", () => {
    renderExpenseCard({
      currentUserId: "user-1",
      currentUserName: "Jordan",
      expense: { payerUserId: "user-1", paidBy: "Doug R." }
    });

    expect(screen.getByText("Doug R. paid")).toBeInTheDocument();
    expect(screen.getByText("you owe")).toBeInTheDocument();
    expect(screen.getByText("$3.00")).toHaveClass("is-negative");
    expect(screen.getByRole("button", { name: "Delete expense" })).toBeDisabled();
  });

  it("keeps delete functionality intact", () => {
    const { onDeleteExpense } = renderExpenseCard();

    fireEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    expect(onDeleteExpense).toHaveBeenCalledWith("expense-1");
  });
});
