import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SettleUpModal from "../SettleUpModal";

const ALEX  = "00000000-0000-4000-8000-000000000001";
const BLAIR = "00000000-0000-4000-8000-000000000002";

const members = [
  { id: ALEX,  name: "Alex" },
  { id: BLAIR, name: "Blair" }
];

describe("SettleUpModal", () => {
  afterEach(() => cleanup());

  it("shows no amount when current user has no outgoing suggestion", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        settlementSuggestions={[{ fromUserId: BLAIR, toUserId: ALEX, amountCents: 6400 }]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );
    // Alex is the creditor; no outgoing suggestion — no amount span, no chips in
    // "I'm paying"
    expect(screen.queryByLabelText("Settlement amount")).not.toBeInTheDocument();
  });

  it("shows suggestion amount when current user is the payer", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        settlementSuggestions={[{ fromUserId: ALEX, toUserId: BLAIR, amountCents: 6400 }]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Settlement amount")).toHaveTextContent("64.00");
  });

  it("disables Save when there are no eligible members", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        settlementSuggestions={[]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("submits correct paying payload on Save", async () => {
    const onSaveSettlement = vi.fn(async () => ({ settlementId: "s-1" }));
    const onClose = vi.fn();

    render(
      <SettleUpModal
        isOpen
        onClose={onClose}
        currentUserId={BLAIR}
        currentUserName="Blair"
        members={members}
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
      note: null,
      recordedByPayee: false
    });
    expect(onSaveSettlement.mock.calls[0][0].settledAt).toMatch(/T00:00:00[+-]\d{2}:\d{2}$/);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("submits swapped payload in I received mode", async () => {
    const onSaveSettlement = vi.fn(async () => ({ settlementId: "s-2" }));

    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={ALEX}
        currentUserName="Alex"
        members={members}
        settlementSuggestions={[{ fromUserId: BLAIR, toUserId: ALEX, amountCents: 6400 }]}
        groupName="Trip"
        onSaveSettlement={onSaveSettlement}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "I received" }));
    // Blair chip should be auto-selected; click Save
    await waitFor(() => expect(screen.getByLabelText("Settlement amount")).toHaveTextContent("64.00"));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaveSettlement).toHaveBeenCalledTimes(1));

    expect(onSaveSettlement.mock.calls[0][0]).toMatchObject({
      fromUserId: BLAIR,
      toUserId: ALEX,
      amountCents: 6400,
      recordedByPayee: true
    });
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
        settlementSuggestions={[
          { fromUserId: BLAIR, toUserId: ALEX,  amountCents: 2500 },
          { fromUserId: DAVE,  toUserId: CAROL, amountCents: 3000 }
        ]}
        groupName="4P"
        onSaveSettlement={vi.fn()}
      />
    );

    // Blair owes Alex .00; Dave's .00 must not appear
    expect(screen.getByLabelText("Settlement amount")).toHaveTextContent("25.00");
    expect(screen.queryByText("30.00")).not.toBeInTheDocument();
  });

  it("shows contextual message and disables Save when no suggestions exist", async () => {
    render(
      <SettleUpModal
        isOpen
        onClose={vi.fn()}
        currentUserId={BLAIR}
        currentUserName="Blair"
        members={members}
        settlementSuggestions={[]}
        groupName="Trip"
        onSaveSettlement={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByText("You have no outstanding amounts to pay.")
      ).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});