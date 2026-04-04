import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import DashboardView from "../DashboardView";

vi.mock("../../services/friendService", () => ({
  friendService: {
    detail: vi.fn(async () => ({ sharedGroups: [] }))
  }
}));

import { friendService } from "../../services/friendService";

const mockFriendDirectory = [
  {
    id: "fc-julio",
    displayName: "Julio Mendoza",
    email: "julio@mambatech.io",
    status: "Pending",
    friendUserId: null,
    netBalanceCents: 0,
    netBalanceLabel: "All settled",
    sharedGroupCount: 0,
    hasActiveSharedBalances: false,
    lastUsedAtUtc: null
  },
  {
    id: "fc-doug",
    displayName: "Doug Rosenberger",
    email: "doug@example.com",
    status: "Connected",
    friendUserId: "user-doug",
    netBalanceCents: 500,
    netBalanceLabel: "Doug owes you $5.00",
    sharedGroupCount: 1,
    hasActiveSharedBalances: true,
    lastUsedAtUtc: "2026-04-01T00:00:00Z"
  },
  {
    id: "fc-mina",
    displayName: "Mina Torres",
    email: "mina@example.com",
    status: "Connected",
    friendUserId: "user-mina",
    netBalanceCents: -230,
    netBalanceLabel: "You owe Mina $2.30",
    sharedGroupCount: 2,
    hasActiveSharedBalances: true,
    lastUsedAtUtc: "2026-03-28T00:00:00Z"
  }
];

const mockMinaDetail = {
  id: "fc-mina",
  displayName: "Mina Torres",
  email: "mina@example.com",
  status: "Connected",
  friendUserId: "user-mina",
  netBalanceCents: -230,
  netBalanceLabel: "You owe Mina $2.30",
  summary: "You owe Mina $2.30",
  sharedGroups: [
    {
      groupId: "group-2",
      groupName: "Summer Euro Trip",
      balanceCents: 1050,
      balanceLabel: "Mina owes you $10.50",
      hasUnsettledExpenses: true
    },
    {
      groupId: "group-3",
      groupName: "Lake House Weekend",
      balanceCents: -1280,
      balanceLabel: "You owe Mina $12.80",
      hasUnsettledExpenses: true
    }
  ]
};

function renderView(overrideProps = {}, contextOverrides = {}) {
  cleanup();
  const props = {
    selectedGroupId: "group-1",
    groups: [{ id: "group-1", name: "Love Nest", createdBy: "user-1" }],
    newGroupName: "",
    pendingInvites: [],
    pendingInvitesLoading: false,
    pendingInvitesError: "",
    groupOwnershipById: {},
    friendDirectory: mockFriendDirectory,
    friendsLoading: false,
    friendsError: "",
    selectedFriendId: "fc-julio",
    onOpenGroupPage: vi.fn(),
    onOpenAccount: vi.fn(),
    onSelectFriend: vi.fn(),
    onCreateGroup: vi.fn((event) => event.preventDefault()),
    onAcceptPendingInvite: vi.fn(),
    onRefreshPendingInvites: vi.fn(),
    setSelectedGroupId: vi.fn(),
    setNewGroupName: vi.fn(),
    ...overrideProps
  };

  const authContextValue = {
    currentName: "User",
    currentEmail: "u@example.com",
    currentId: "user-1",
    currentAvatarUrl: "",
    onLogout: vi.fn(),
    ...contextOverrides.auth
  };

  const alertContextValue = {
    error: "",
    success: "",
    busy: false,
    setError: vi.fn(),
    setSuccess: vi.fn(),
    setBusy: vi.fn(),
    clearAlerts: vi.fn(),
    ...contextOverrides.alert
  };

  render(
    <AuthContext.Provider value={authContextValue}>
      <AlertContext.Provider value={alertContextValue}>
        <DashboardView {...props} />
      </AlertContext.Provider>
    </AuthContext.Provider>
  );

  return { props };
}

describe("DashboardView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-03-20T00:00:00Z"));
    friendService.detail.mockResolvedValue({ sharedGroups: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders the pending friend in the accordion list", () => {
    renderView({ selectedFriendId: "fc-julio" });

    const trigger = screen.getByRole("button", { name: /Julio Mendoza/i });
    expect(within(trigger).getByText("Invite pending")).toBeInTheDocument();
    expect(within(trigger).getByText("Pending")).toBeInTheDocument();
  });

  it("renders the connected friend accordion expanded with balance strip", async () => {
    friendService.detail.mockResolvedValueOnce({
      sharedGroups: [
        {
          groupId: "group-1",
          groupName: "Love Nest",
          balanceCents: 500,
          balanceLabel: "Doug owes you $5.00",
          hasUnsettledExpenses: true
        }
      ]
    });

    renderView({ selectedFriendId: "fc-doug" });

    const trigger = screen.getByRole("button", { name: /Doug Rosenberger/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await waitFor(() => {
      expect(screen.getAllByText("Doug owes you $5.00").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("1 shared group")).toBeInTheDocument();
  });

  it("calls onSelectFriend when a friend is clicked in the sidebar", () => {
    const onSelectFriend = vi.fn();
    renderView({ onSelectFriend });

    fireEvent.click(screen.getByRole("button", { name: /Doug Rosenberger/i }));

    expect(onSelectFriend).toHaveBeenCalledWith("fc-doug");
  });

  it("renders net summary and per-group detail for Mina", async () => {
    friendService.detail.mockResolvedValueOnce(mockMinaDetail);

    renderView({ selectedFriendId: "fc-mina" });

    const trigger = screen.getByRole("button", { name: /Mina Torres/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await waitFor(() => {
      expect(screen.getAllByText("You owe Mina $2.30").length).toBeGreaterThan(0);
    });

    expect(screen.getByText("2 shared groups")).toBeInTheDocument();
    expect(screen.getByText("Summer Euro Trip")).toBeInTheDocument();
    expect(screen.getByText("Lake House Weekend")).toBeInTheDocument();
  });

  it("shows empty state when no shared groups in detail", async () => {
    friendService.detail.mockResolvedValueOnce({ sharedGroups: [] });

    renderView({ selectedFriendId: "fc-doug" });

    await waitFor(() => {
      expect(screen.getByText("No shared expenses yet.")).toBeInTheDocument();
    });
  });

  it("shows friends loading state", () => {
    renderView({ friendsLoading: true, friendDirectory: [] });
    expect(screen.getByText("Loading friends...")).toBeInTheDocument();
  });

  it("shows friends error state", () => {
    renderView({ friendsError: "Could not load friends.", friendDirectory: [] });
    expect(screen.getByText("Could not load friends.")).toBeInTheDocument();
  });

  it("shows empty state when no friends and not loading", () => {
    renderView({ friendDirectory: [], selectedFriendId: "" });
    expect(screen.getByText("No friends found.")).toBeInTheDocument();
  });

  it("filters friends by displayName on search", () => {
    renderView();

    const searchInput = screen.getByLabelText("Find a friend");
    fireEvent.change(searchInput, { target: { value: "mina" } });

    expect(screen.getByRole("button", { name: /Mina Torres/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Doug Rosenberger/i })).not.toBeInTheDocument();
  });

  it("filters friends by email on search", () => {
    renderView();

    const searchInput = screen.getByLabelText("Find a friend");
    fireEvent.change(searchInput, { target: { value: "doug@example" } });

    expect(screen.getByRole("button", { name: /Doug Rosenberger/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mina Torres/i })).not.toBeInTheDocument();
  });

  it("renders friends in the order received (no client-side sort)", () => {
    renderView({ selectedFriendId: "" });

    const triggers = screen.getAllByRole("button", { name: /(Julio Mendoza|Doug Rosenberger|Mina Torres)/i });
    const names = triggers.map((t) => t.textContent?.trim()).filter(Boolean);

    // Should appear in the same order as the input array: Julio, Doug, Mina
    expect(names[0]).toMatch(/Julio/);
    expect(names[1]).toMatch(/Doug/);
    expect(names[2]).toMatch(/Mina/);
  });

  it("renders loading invite state", () => {
    renderView({ pendingInvitesLoading: true });
    expect(screen.getByText("Loading pending invites...")).toBeInTheDocument();
  });

  it("hides invites section when there are no pending invites", () => {
    renderView({ pendingInvites: [], pendingInvitesLoading: false, pendingInvitesError: "" });
    expect(screen.queryByRole("heading", { name: "Group invites" })).not.toBeInTheDocument();
  });

  it("renders unknown sender fallback when pending invite sender details are unavailable", () => {
    renderView({
      pendingInvites: [{
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        expiresAt: "2026-03-25T00:00:00Z"
      }]
    });

    expect(screen.getByText("Unknown sender")).toBeInTheDocument();
  });

  it("opens the account dropdown and navigates to the account page", () => {
    const onOpenAccount = vi.fn();
    renderView({ onOpenAccount });

    fireEvent.click(screen.getByRole("button", { name: "User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Your Account" }));

    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

  it("shows owner crown only for owned groups", () => {
    renderView({
      groups: [
        { id: "group-1", name: "Owned Group", createdBy: "user-1" },
        { id: "group-2", name: "Joined Group", createdBy: "user-2" }
      ]
    });

    expect(screen.getAllByLabelText("Group owner")).toHaveLength(1);
  });

  it("switches the mobile section panel when a section tab is pressed", () => {
    renderView({ selectedFriendId: "fc-doug" });

    const sectionTabs = within(screen.getByRole("navigation", { name: "Dashboard sections" })).getAllByRole("button");
    const groupsPanel = screen.getByRole("heading", { name: "Groups" }).closest(".dashboard-mobile-panel");
    const friendsPanel = screen.getByText("Find a friend").closest(".dashboard-mobile-panel");

    expect(sectionTabs.map((tab) => tab.textContent)).toEqual(["Groups", "Friends"]);
    expect(groupsPanel).toHaveClass("is-active");
    expect(friendsPanel).not.toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Friends" }));

    expect(friendsPanel).toHaveClass("is-active");
    expect(groupsPanel).not.toHaveClass("is-active");
  });

  it("accordion expand triggers onSelectFriend and stays in friends panel on mobile", () => {
    const onSelectFriend = vi.fn();
    renderView({ onSelectFriend });

    fireEvent.click(screen.getByRole("button", { name: "Friends" }));
    fireEvent.click(screen.getByRole("button", { name: /Doug Rosenberger/i }));

    const friendsPanel = screen.getByText("Find a friend").closest(".dashboard-mobile-panel");

    expect(onSelectFriend).toHaveBeenCalledWith("fc-doug");
    expect(friendsPanel).toHaveClass("is-active");
  });

  it("re-hydrates stale list summary from shared-group net when selected", async () => {
    const friendDirectory = [
      {
        id: "fc-julio",
        displayName: "Julio C. Mendoza",
        email: "julio@example.com",
        status: "Connected",
        friendUserId: "user-julio",
        netBalanceCents: -5250,
        netBalanceLabel: "You owe Julio C. Mendoza $52.50",
        sharedGroupCount: 2,
        hasActiveSharedBalances: true,
        lastUsedAtUtc: "2026-04-01T00:00:00Z"
      }
    ];

    friendService.detail.mockResolvedValueOnce({
      id: "fc-julio",
      displayName: "Julio C. Mendoza",
      email: "julio@example.com",
      status: "Connected",
      friendUserId: "user-julio",
      sharedGroups: [
        {
          groupId: "group-1",
          groupName: "LaTienda",
          balanceCents: -5250,
          balanceLabel: "You owe $52.50",
          hasUnsettledExpenses: true
        },
        {
          groupId: "group-2",
          groupName: "NewTest",
          balanceCents: 12000,
          balanceLabel: "They owe you $120.00",
          hasUnsettledExpenses: true
        }
      ]
    });

    renderView({
      groups: [
        { id: "group-1", name: "LaTienda", createdBy: "user-1" },
        { id: "group-2", name: "NewTest", createdBy: "user-1" }
      ],
      friendDirectory,
      selectedFriendId: "fc-julio"
    });

    await waitFor(() => {
      expect(screen.getAllByText("Julio C. Mendoza owes you $67.50").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("You owe Julio C. Mendoza $52.50")).not.toBeInTheDocument();
  });
});

