import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    onBackToDashboard: vi.fn(),
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
    // Leave Group button has text content "Leave Group"
    // The title provides tooltip but accessible name is the text
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
});
