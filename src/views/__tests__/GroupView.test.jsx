import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import GroupView from "../GroupView";

function mockMatchMedia(matches = true) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

function renderView(overrideProps = {}) {
  const { __isMobile = true, ...viewOverrides } = overrideProps;
  mockMatchMedia(__isMobile);

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
    hasMoreExpenses: false,
    expensesPageLoading: false,
    expensesPageError: "",
    hasMoreSettlements: false,
    settlementsPageLoading: false,
    settlementsPageError: "",
    settlementExpensePages: {},
    listVariants: {},
    itemVariants: {},
    sentInvites: [],
    inviteResult: null,
    onBackToDashboard: vi.fn(),
    onCreateInvite: vi.fn().mockResolvedValue({ id: "invite-1", token: "token-1" }),
    onDeleteInvite: vi.fn(),
    onRefreshInvite: vi.fn(),
    onOpenExpenseModal: vi.fn(),
    onLoadOlderExpenses: vi.fn(),
    onLoadMoreSettlements: vi.fn(),
    onLoadSettlementExpenses: vi.fn(),
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
    ...viewOverrides
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
  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    vi.restoreAllMocks();
  });

  it("uses the same mapped balance as the dashboard card for the group hero", () => {
    renderView();

    expect(screen.getByText("You are owed")).toBeInTheDocument();
    expect(screen.getByText("$7.50")).toBeInTheDocument();
    expect(screen.queryByText("You are settled up")).not.toBeInTheDocument();
  });

  it("renders Leave Group button disabled for the group owner", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    renderView({ isGroupOwner: true, effectiveMyRole: "OWNER" });
    await user.click(screen.getByRole("button", { name: /Group actions for/i }));
    const leaveBtn = screen.getByRole("menuitem", { name: "Leave Group" });
    expect(leaveBtn).toBeDisabled();
  });

  it("renders Leave Group button enabled for a non-owner member", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    renderView({ isGroupOwner: false, effectiveMyRole: "MEMBER" });
    await user.click(screen.getByRole("button", { name: /Group actions for/i }));
    const leaveBtn = screen.getByRole("menuitem", { name: "Leave Group" });
    expect(leaveBtn).not.toBeDisabled();
  });

  it("calls onOpenLeaveGroupModal when Leave Group is clicked by a non-owner", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const onOpenLeaveGroupModal = vi.fn();
    renderView({ isGroupOwner: false, effectiveMyRole: "MEMBER", onOpenLeaveGroupModal });
    await user.click(screen.getByRole("button", { name: /Group actions for/i }));
    await user.click(screen.getByRole("menuitem", { name: "Leave Group" }));
    expect(onOpenLeaveGroupModal).toHaveBeenCalledOnce();
  });

  it("submits the group invite form with name and email", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const onCreateInvite = vi.fn().mockResolvedValue({ id: "invite-1", token: "token-1" });

    renderView({ onCreateInvite });

    fireEvent.click(screen.getByRole("button", { name: "Invite" }));
    await user.type(screen.getByLabelText("Name"), "Doug Rosenberger");
    await user.type(screen.getByLabelText("Email"), "doug@example.com");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onCreateInvite).toHaveBeenCalledWith({
      name: "Doug Rosenberger",
      email: "doug@example.com",
      displayName: "Doug Rosenberger"
    });
  });

  it("renders sent invites for the current group", () => {
    renderView({
      __isMobile: false,
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

  it("keeps invite section under members on desktop layout", () => {
    renderView({ __isMobile: false });

    expect(screen.getByText("Group Members")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    expect(document.querySelector('[data-mobile-panel="invite"]')).not.toBeInTheDocument();
  });

  it("switches the group mobile section panel when a section tab is pressed", () => {
    renderView();

    const expensesPanel = screen.getByText("Recent Expenses").closest(".group-mobile-panel");
    const membersPanel = screen.getByText("Group Members").closest(".group-mobile-panel");
    const invitePanel = document.querySelector('[data-mobile-panel="invite"]');

    // Members is now the default active panel
    expect(membersPanel).toHaveClass("is-active");
    expect(expensesPanel).not.toHaveClass("is-active");
    expect(invitePanel).not.toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));

    expect(expensesPanel).toHaveClass("is-active");
    expect(membersPanel).not.toHaveClass("is-active");
    expect(invitePanel).not.toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Invite" }));

    expect(invitePanel).toHaveClass("is-active");
    expect(expensesPanel).not.toHaveClass("is-active");
  });

  it("hides settled expenses section in Expenses when there are no settled expenses", () => {
    renderView({
      expenses: [{
        id: "expense-1",
        description: "Lunch",
        amountCents: 1200,
        paidByUserId: "user-1",
        payerUserId: "user-1",
        settledByPayer: false,
        splitType: "equally",
        createdAt: "2026-03-16T00:00:00Z",
        settlementId: null,
        splits: [{ userId: "user-2", amountOwedCents: 1200 }]
      }],
      settlements: []
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.queryByText("Settled Expense Groups")).not.toBeInTheDocument();
  });

  it("renders settled expenses section inside Expenses tab when settled groups exist", () => {
    renderView({
      expenses: [{
        id: "expense-1",
        description: "Dinner",
        amountCents: 3200,
        paidByUserId: "user-1",
        payerUserId: "user-1",
        settledByPayer: true,
        splitType: "equally",
        createdAt: "2026-03-16T00:00:00Z",
        settlementId: "settlement-1",
        splits: [{ userId: "user-2", amountOwedCents: 3200 }]
      }],
      settlements: [{
        id: "settlement-1",
        fromUserName: "User Two",
        toUserName: "User One",
        amountCents: 3200,
        settledAt: "2026-03-17T00:00:00Z",
        expenseIds: ["expense-1"]
      }]
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText("Settled Expense Groups")).toBeInTheDocument();
  });

  it("calls onLoadOlderExpenses from the Recent Expenses pager", () => {
    const onLoadOlderExpenses = vi.fn();
    renderView({
      hasMoreExpenses: true,
      onLoadOlderExpenses,
      expenses: [{
        id: "expense-1",
        description: "Lunch",
        amountCents: 1200,
        payerUserId: "user-1",
        createdAt: "2026-03-16T00:00:00Z",
        settlementId: null,
        splits: []
      }]
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(onLoadOlderExpenses).toHaveBeenCalledOnce();
  });

  it("does not show the Recent Expenses pager when there are no visible recent expenses", () => {
    renderView({
      hasMoreExpenses: true,
      expenses: []
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));

    expect(screen.getByText("No unsettled expenses.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("renders settlement metadata rows and loads linked expenses on demand", () => {
    const onLoadSettlementExpenses = vi.fn();
    renderView({
      settlements: [{
        id: "settlement-1",
        fromUserName: "User Two",
        toUserName: "User One",
        amountCents: 3200,
        settledAt: "2026-03-17T00:00:00Z",
        expenseCount: 12
      }],
      onLoadSettlementExpenses
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText(/Expenses: 12/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Load settlement expenses/ }));

    expect(onLoadSettlementExpenses).toHaveBeenCalledWith("settlement-1");
  });

  it("renders loaded settlement expenses and load-more controls", () => {
    const onLoadSettlementExpenses = vi.fn();
    renderView({
      settlements: [{
        id: "settlement-1",
        fromUserName: "User Two",
        toUserName: "User One",
        amountCents: 3200,
        settledAt: "2026-03-17T00:00:00Z",
        expenseCount: 30
      }],
      settlementExpensePages: {
        "settlement-1": {
          loaded: true,
          hasMoreExpenses: true,
          expenses: [{
            id: "expense-1",
            description: "Loaded dinner",
            amountCents: 3200,
            payerUserId: "user-1",
            createdAt: "2026-03-16T00:00:00Z",
            splits: []
          }]
        }
      },
      onLoadSettlementExpenses
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText("Loaded dinner")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Load more" }).at(-1));

    expect(onLoadSettlementExpenses).toHaveBeenCalledWith("settlement-1");
  });

  it("collapses and reopens a loaded settlement expense group from the card header", () => {
    renderView({
      settlements: [{
        id: "settlement-1",
        fromUserName: "User Two",
        toUserName: "User One",
        amountCents: 3200,
        settledAt: "2026-03-17T00:00:00Z",
        expenseCount: 30
      }],
      settlementExpensePages: {
        "settlement-1": {
          loaded: true,
          hasMoreExpenses: false,
          expenses: [{
            id: "expense-1",
            description: "Loaded dinner",
            amountCents: 3200,
            payerUserId: "user-1",
            createdAt: "2026-03-16T00:00:00Z",
            splits: []
          }]
        }
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    const settlementToggle = screen.getByRole("button", { name: /Load settlement expenses/ });

    expect(screen.getByText("Loaded dinner")).toBeInTheDocument();

    fireEvent.click(settlementToggle);

    expect(screen.queryByText("Loaded dinner")).not.toBeInTheDocument();

    fireEvent.click(settlementToggle);

    expect(screen.getByText("Loaded dinner")).toBeInTheDocument();
  });

  it("calls onLoadMoreSettlements from the settlement row pager", () => {
    const onLoadMoreSettlements = vi.fn();
    renderView({
      hasMoreSettlements: true,
      onLoadMoreSettlements,
      settlements: [{
        id: "settlement-1",
        fromUserName: "User Two",
        toUserName: "User One",
        amountCents: 3200,
        settledAt: "2026-03-17T00:00:00Z",
        expenseCount: 1
      }]
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));
    fireEvent.click(screen.getByRole("button", { name: "Load more settlements" }));

    expect(onLoadMoreSettlements).toHaveBeenCalledOnce();
  });

  it("does not show the settled groups pager when there are no settled expense groups", () => {
    renderView({
      hasMoreSettlements: true,
      settlements: []
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));

    expect(screen.queryByText("Settled Expense Groups")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more settlements" })).not.toBeInTheDocument();
  });

  it("uses the shared centered pager styling for settled expense group paging", () => {
    renderView({
      hasMoreSettlements: true,
      settlements: [{
        id: "settlement-1",
        fromUserName: "User Two",
        toUserName: "User One",
        amountCents: 3200,
        settledAt: "2026-03-17T00:00:00Z",
        expenseCount: 1
      }]
    });

    fireEvent.click(screen.getByRole("button", { name: "Expenses" }));

    expect(screen.getByRole("button", { name: "Load more settlements" }).closest(".expense-pagination-actions")).not.toBeNull();
  });

  it("shows a back-to-top overlay after scrolling and scrolls to the page top", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", { configurable: true, value: scrollTo });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });

    renderView();

    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 700 });
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
