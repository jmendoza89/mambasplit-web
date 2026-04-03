import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import GroupView from "../GroupView";

function renderView(overrideProps = {}) {
  const props = {
    selectedGroupId: "group-1",
    groupLoading: false,
    isGroupOwner: true,
    displayedGroup: {
      id: "group-1",
      name: "Test1",
      netBalanceCents: 750
    },
    detailsGroupInfo: {
      id: "group-1",
      name: "Test1",
      createdAt: "2026-03-16T00:00:00Z"
    },
    detailsMe: {
      role: "OWNER",
      netBalanceCents: 750
    },
    effectiveMemberCount: 2,
    expenseCount: 10,
    settlementCount: 1,
    totalExpense: 33,
    totalSettlementAmount: 3,
    effectiveMyRole: "OWNER",
    groupError: "",
    displayMembers: [],
    expenses: [],
    settlements: [],
    settlementSuggestions: [],
    recentSettlementId: null,
    listVariants: {},
    itemVariants: {},
    sentInvites: [],
    inviteResult: null,
    onBackToDashboard: vi.fn(),
    onCreateInvite: vi.fn().mockResolvedValue({ id: "invite-1", token: "token-1" }),
    onDeleteInvite: vi.fn(),
    onRefreshInvite: vi.fn(),
    onCreateMockFriendInvite: vi.fn(),
    onOpenExpenseModal: vi.fn(),
    onOpenSettleUpModal: vi.fn(),
    onCloseSettleUpModal: vi.fn(),
    onCreateSettlement: vi.fn(),
    isSettleUpModalOpen: false,
    onDeleteExpense: vi.fn(),
    onRefreshGroupDetail: vi.fn(),
    onDeleteGroup: vi.fn(),
    isLeaveGroupModalOpen: false,
    onOpenLeaveGroupModal: vi.fn(),
    onCancelLeaveGroup: vi.fn(),
    onConfirmLeaveGroup: vi.fn(),
    ...overrideProps
  };

  render(
    <AuthContext.Provider value={{
      currentId: "user-1",
      currentName: "User One",
      onLogout: vi.fn()
    }}>
      <AlertContext.Provider value={{
        busy: false,
        error: "",
        success: "",
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        clearAlerts: vi.fn()
      }}>
        <GroupView {...props} />
      </AlertContext.Provider>
    </AuthContext.Provider>
  );

  return { props };
}

describe("GroupView", () => {
  afterEach(() => cleanup());

  it("uses the same mapped balance as the dashboard card for the group hero", () => {
    renderView();

    expect(screen.getByText("You are owed")).toBeInTheDocument();
    expect(screen.getByText("$7.50")).toBeInTheDocument();
    expect(screen.queryByText("You are settled up")).not.toBeInTheDocument();
  });

  it("renders Leave Group button disabled for the group owner", () => {
    renderView({ isGroupOwner: true, effectiveMyRole: "OWNER" });
    const leaveBtn = screen.getByRole("button", { name: "Leave Group" });
    expect(leaveBtn).toBeDisabled();
  });

  it("renders Leave Group button enabled for a non-owner member", () => {
    renderView({ isGroupOwner: false, effectiveMyRole: "MEMBER" });
    const leaveBtn = screen.getByRole("button", { name: "Leave Group" });
    expect(leaveBtn).not.toBeDisabled();
  });

  it("calls onOpenLeaveGroupModal when Leave Group is clicked by a non-owner", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const onOpenLeaveGroupModal = vi.fn();
    renderView({ isGroupOwner: false, effectiveMyRole: "MEMBER", onOpenLeaveGroupModal });
    await user.click(screen.getByRole("button", { name: "Leave Group" }));
    expect(onOpenLeaveGroupModal).toHaveBeenCalledOnce();
  });

  it("submits the group invite form with name and email", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const onCreateInvite = vi.fn().mockResolvedValue({ id: "invite-1", token: "token-1" });
    const onCreateMockFriendInvite = vi.fn();

    renderView({ onCreateInvite, onCreateMockFriendInvite });

    await user.type(screen.getByLabelText("Name"), "Doug Rosenberger");
    await user.type(screen.getByLabelText("Email"), "doug@example.com");
    await user.click(screen.getByRole("button", { name: "Add person" }));

    expect(onCreateInvite).toHaveBeenCalledWith({
      name: "Doug Rosenberger",
      email: "doug@example.com"
    });
    expect(onCreateMockFriendInvite).toHaveBeenCalledWith({
      name: "Doug Rosenberger",
      email: "doug@example.com",
      groupId: "group-1",
      groupName: "Test1"
    });
  });

  it("renders sent invites for the current group", () => {
    renderView({
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Test1",
        recipientName: "Friend Person",
        sentToEmail: "friend@example.com",
        token: "token-1",
        expiresAt: "2026-03-30T00:00:00Z"
      }]
    });

    expect(screen.getByText("Friend Person (friend@example.com)")).toBeInTheDocument();
  });

  it("switches the group mobile section panel when a section tab is pressed", () => {
    renderView();

    const expensesPanel = screen.getByText("Recent Expenses").closest(".group-mobile-panel");
    const membersPanel = screen.getByText("Group Members").closest(".group-mobile-panel");

    expect(expensesPanel).toHaveClass("is-active");
    expect(membersPanel).not.toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    expect(membersPanel).toHaveClass("is-active");
    expect(expensesPanel).not.toHaveClass("is-active");
  });

  it("opens the compact mobile action menu from the more button", () => {
    renderView();

    const actionMenu = screen.getByRole("button", { name: "Refresh" }).closest(".group-action-secondary");
    expect(actionMenu).not.toHaveClass("is-open");

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(actionMenu).toHaveClass("is-open");
  });

  it("toggles the collapsible group hero details", () => {
    renderView();

    const toggleButton = screen.getByRole("button", { name: "Show group stats" });
    const heroDetails = toggleButton.nextElementSibling;
    expect(heroDetails).not.toHaveClass("is-open");

    fireEvent.click(toggleButton);
    expect(heroDetails).toHaveClass("is-open");

    fireEvent.click(screen.getByRole("button", { name: "Hide group stats" }));
    expect(heroDetails).not.toHaveClass("is-open");
  });
});
