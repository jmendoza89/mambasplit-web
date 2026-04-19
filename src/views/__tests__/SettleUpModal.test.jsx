import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettleUpModal from "../SettleUpModal";

const ALEX  = "00000000-0000-4000-8000-000000000001";
const BLAIR = "00000000-0000-4000-8000-000000000002";

const members = [
  { id: ALEX,  name: "Alex" },
  { id: BLAIR, name: "Blair" }
];

const expenses = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    description: "Dinner",
    amountCents: 1200,
    payerUserId: ALEX,
    createdAt: "2026-03-08T12:00:00Z",
    splits: [
      { userId: ALEX,  amountOwedCents: 600 },
      { userId: BLAIR, amountOwedCents: 600 }
    ]
  }
];

describe("SettleUpModal", () => {
  afterEach(() => cleanup());

  it("shows 0.00 for creditor who has no outgoing suggestion", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        expenses={expenses}
        settlementSuggestions={[{
          fromUserId: BLAIR,
          toUserId: ALEX,
          amountCents: 6400
        }]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );

    // Alex is the creditor; no suggestion with Alex as fromUserId → 0.00
    expect(screen.getAllByLabelText("Settlement amount")[0]).toHaveValue("0.00");
  });

  it("prefills amount from suggestion when current user is the payer", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        expenses={expenses}
        settlementSuggestions={[{
          fromUserId: ALEX,
          toUserId: BLAIR,
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
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        expenses={expenses}
        settlementSuggestions={[{
          fromUserId: ALEX,
          toUserId: BLAIR,
          amountCents: 600
        }]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    fireEvent.change(screen.getAllByLabelText("Settlement amount")[0], { target: { value: "0.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Settlement amount must be greater than zero.")).toBeInTheDocument();
    expect(onSaveSettlement).not.toHaveBeenCalled();
  });

  it("prefills amount from server suggestion, ignoring local expense data", async () => {
    // server suggestion says 6400; local computation from expenses would give 600
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={BLAIR}
        currentUserName="Blair"
        members={members}
        expenses={expenses}
        settlementSuggestions={[{ fromUserId: BLAIR, toUserId: ALEX, amountCents: 6400 }]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );
    expect(screen.getAllByLabelText("Settlement amount")[0]).toHaveValue("64.00");
  });

  it("submits payload without expenseIds", async () => {
    const onSaveSettlement = vi.fn(async () => ({ settlementId: "s-1" }));
    const onClose = vi.fn();

    render(
      <SettleUpModal
        isOpen
        onClose={onClose}
        currentUserId={BLAIR}
        currentUserName="Blair"
        members={members}
        expenses={expenses}
        settlementSuggestions={[{ fromUserId: BLAIR, toUserId: ALEX, amountCents: 600 }]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaveSettlement).toHaveBeenCalledTimes(1));
    expect(onSaveSettlement.mock.calls[0][0]).not.toHaveProperty("expenseIds");
    expect(onSaveSettlement.mock.calls[0][0]).toMatchObject({
      fromUserId: BLAIR,
      toUserId: ALEX,
      amountCents: 600,
      note: null
    });
    expect(onSaveSettlement.mock.calls[0][0].settledAt).toMatch(/T00:00:00[+-]\d{2}:\d{2}$/);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses correct pair suggestion in a 4-member group", async () => {
    const CAROL = "00000000-0000-4000-8000-000000000003";
    const DAVE  = "00000000-0000-4000-8000-000000000004";

    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={BLAIR}
        currentUserName="Blair"
        members={[
          { id: ALEX, name: "Alex" }, { id: BLAIR, name: "Blair" },
          { id: CAROL, name: "Carol" }, { id: DAVE, name: "Dave" }
        ]}
        expenses={[]}
        settlementSuggestions={[
          { fromUserId: BLAIR, toUserId: ALEX,  amountCents: 2500 },
          { fromUserId: DAVE,  toUserId: CAROL, amountCents: 3000 }
        ]}
        groupName="4P"
        onSaveSettlement={vi.fn()}
      />
    );

    // Blair's suggestion is $25.00; Dave's $30.00 must not appear
    expect(screen.getAllByLabelText("Settlement amount")[0]).toHaveValue("25.00");
  });

  it("shows error and blocks save when no suggestion exists for pair", async () => {
    const onSaveSettlement = vi.fn();

    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={BLAIR}
        currentUserName="Blair"
        members={members}
        expenses={[]}
        settlementSuggestions={[]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    // Banner appears after init useEffect resolves fromUserId/toUserId
    await waitFor(() =>
      expect(screen.getByText("No outstanding balance found for this pair.")).toBeInTheDocument()
    );

    // handleSave also blocks via noSuggestion guard (amount is 0, but noSuggestion fires first
    // after the amount check — set amount > 0 to reach the noSuggestion guard)
    fireEvent.change(screen.getAllByLabelText("Settlement amount")[0], { target: { value: "1.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("No outstanding balance found for this pair.")).toBeInTheDocument();
    expect(onSaveSettlement).not.toHaveBeenCalled();
  });
});
