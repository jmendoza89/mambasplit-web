import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettleUpModal from "../SettleUpModal";

const members = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Alex" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Blair" }
];

const expenses = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    description: "Dinner",
    amountCents: 1200,
    createdAt: "2026-03-08T12:00:00Z"
  }
];

describe("SettleUpModal", () => {
  afterEach(() => cleanup());

  it("prefills amount from total recent expenses", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={members[0].id}
        currentUserName="Alex"
        members={members}
        expenses={expenses}
        settlementSuggestions={[{
          fromUserId: members[1].id,
          toUserId: members[0].id,
          amountCents: 6400
        }]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );

    expect(screen.getAllByLabelText("Settlement amount")[0]).toHaveValue("64.00");
  });

  it("blocks save when settlement amount is not positive", async () => {
    const onSaveSettlement = vi.fn();

    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={members[0].id}
        currentUserName="Alex"
        members={members}
        expenses={expenses}
        settlementSuggestions={[]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    fireEvent.change(screen.getAllByLabelText("Settlement amount")[0], { target: { value: "0.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Settlement amount must be greater than zero.")).toBeInTheDocument();
    expect(onSaveSettlement).not.toHaveBeenCalled();
  });

  it("submits settlement payload with expenseIds", async () => {
    const onSaveSettlement = vi.fn(async () => ({ settlementId: "settlement-1" }));
    const onClose = vi.fn();

    render(
      <SettleUpModal
        isOpen
        onClose={onClose}
        currentUserId={members[0].id}
        currentUserName="Alex"
        members={members}
        expenses={expenses}
        settlementSuggestions={[]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    fireEvent.change(screen.getAllByLabelText("Settlement amount")[0], { target: { value: "12.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaveSettlement).toHaveBeenCalledTimes(1));
    expect(onSaveSettlement.mock.calls[0][0]).toMatchObject({
      fromUserId: members[0].id,
      toUserId: members[1].id,
      amountCents: 1200,
      expenseIds: [expenses[0].id],
      note: null
    });
    expect(onSaveSettlement.mock.calls[0][0].settledAt).toMatch(/T00:00:00[+-]\d{2}:\d{2}$/);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks save when there are no unsettled expenses", async () => {
    const onSaveSettlement = vi.fn();

    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={members[0].id}
        currentUserName="Alex"
        members={members}
        expenses={[]}
        settlementSuggestions={[]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    fireEvent.change(screen.getAllByLabelText("Settlement amount")[0], { target: { value: "1.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("No unsettled expenses are available to settle.")).toBeInTheDocument();
    expect(onSaveSettlement).not.toHaveBeenCalled();
  });
});
