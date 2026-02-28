import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AlertContext } from "../../contexts/AlertContext";
import ExpenseModal from "../ExpenseModal";

describe("ExpenseModal", () => {
  it("submits add-expense form when open", () => {
    const onClose = vi.fn();
    const onCreateExpense = vi.fn((e) => e.preventDefault());
    const onExpenseDescriptionKeyDown = vi.fn();
    const setExpenseDescription = vi.fn();
    const setExpenseAmount = vi.fn();

    const alertContextValue = {
      error: "",
      success: "",
      busy: false,
      setError: vi.fn(),
      setSuccess: vi.fn(),
      setBusy: vi.fn(),
      clearAlerts: vi.fn()
    };

    render(
      <AlertContext.Provider value={alertContextValue}>
        <ExpenseModal
          isOpen
          expenseDescription="Dinner"
          expenseAmount="20"
          expenseSavedStatus={null}
          groupLoading={false}
          selectedGroupId="group-1"
          expenseDescriptionRef={createRef()}
          expenseAmountRef={createRef()}
          onClose={onClose}
          onCreateExpense={onCreateExpense}
          onExpenseDescriptionKeyDown={onExpenseDescriptionKeyDown}
          setExpenseDescription={setExpenseDescription}
          setExpenseAmount={setExpenseAmount}
        />
      </AlertContext.Provider>
    );

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form"));
    expect(onCreateExpense).toHaveBeenCalledTimes(1);
  });
});
