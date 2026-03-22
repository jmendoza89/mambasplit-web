import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveGroupModal from "../LeaveGroupModal";

function renderModal(overrideProps = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(async () => {}),
    groupName: "Trip",
    currentUserUnsettledNetCents: 0,
    busy: false,
    ...overrideProps
  };
  render(<LeaveGroupModal {...props} />);
  return props;
}

describe("LeaveGroupModal", () => {
  afterEach(() => cleanup());
  it("renders the Leave Group title when open", () => {
    renderModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Leave Group?")).toBeInTheDocument();
  });

  it("shows no-debt message when currentUserUnsettledNetCents is zero", () => {
    renderModal({ currentUserUnsettledNetCents: 0 });
    expect(screen.getByText("You do not currently owe anything in unsettled expenses.")).toBeInTheDocument();
  });

  it("shows owed amount when currentUserUnsettledNetCents is negative (user owes money)", () => {
    renderModal({ currentUserUnsettledNetCents: -1234 });
    expect(screen.getByText(/You currently owe \$12\.34 in unsettled expenses\./)).toBeInTheDocument();
    expect(screen.getByText(/unsettled expenses will be rebalanced/)).toBeInTheDocument();
  });

  it("shows no-debt message when currentUserUnsettledNetCents is positive (user is owed)", () => {
    renderModal({ currentUserUnsettledNetCents: 500 });
    expect(screen.getByText("You do not currently owe anything in unsettled expenses.")).toBeInTheDocument();
  });

  it("includes the group name in the confirmation question", () => {
    renderModal({ groupName: "Summer Trip" });
    expect(screen.getByText(/Are you sure you want to leave/)).toBeInTheDocument();
    expect(screen.getByText("Summer Trip")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onConfirm when Leave Group is clicked", async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    await user.click(screen.getByRole("button", { name: "Leave Group" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onClose when the close (�) button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: "Close leave group dialog" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not render anything when isOpen is false", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables buttons when busy is true", () => {
    renderModal({ busy: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Leave Group" })).toBeDisabled();
  });
});
