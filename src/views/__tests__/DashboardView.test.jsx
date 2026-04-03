import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import DashboardView from "../DashboardView";
import { initialFriendDirectory } from "../friendsMockData";

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
    friendDirectory: initialFriendDirectory,
    selectedFriendId: "friend-julio",
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the pending friend detail state", () => {
    renderView({ selectedFriendId: "friend-julio" });

    const stage = screen.getByText("julio@mambatech.io").closest(".dashboard-friend-stage");
    expect(within(stage).getByRole("heading", { name: "julio" })).toBeInTheDocument();
    expect(within(stage).getByText("Invite pending")).toBeInTheDocument();
    expect(within(stage).getByText("You have not added any expenses yet")).toBeInTheDocument();
  });

  it("renders the accepted friend detail state", () => {
    renderView({ selectedFriendId: "friend-doug" });

    const stage = screen.getByText("douros03@live.com").closest(".dashboard-friend-stage");
    expect(within(stage).getByRole("heading", { name: "Doug Rosenberger" })).toBeInTheDocument();
    expect(screen.getAllByText("Doug owes you $5.00").length).toBeGreaterThan(0);
    expect(within(stage).getByText("Love Nest")).toBeInTheDocument();
    expect(within(stage).getByRole("button", { name: "Show settled expenses" })).toBeInTheDocument();
  });

  it("calls onSelectFriend when a friend is clicked in the sidebar", () => {
    const onSelectFriend = vi.fn();
    renderView({ onSelectFriend });

    fireEvent.click(screen.getByRole("button", { name: /Doug Rosenberger/i }));

    expect(onSelectFriend).toHaveBeenCalledWith("friend-doug");
  });

  it("shows per-group balances and a net summary for Mina", () => {
    renderView({ selectedFriendId: "friend-mina" });

    const stage = screen.getByText("mina@example.com").closest(".dashboard-friend-stage");
    expect(within(stage).getByText("Summer Euro Trip")).toBeInTheDocument();
    expect(within(stage).getByText("Mina owes you $10.50")).toBeInTheDocument();
    expect(within(stage).getByText("Lake House Weekend")).toBeInTheDocument();
    expect(within(stage).getByText("You owe Mina $12.80")).toBeInTheDocument();

    const balanceRail = screen.getByText("You owe Mina $2.30").closest(".dashboard-balance-rail");
    expect(within(balanceRail).getByText("Summer Euro Trip")).toBeInTheDocument();
    expect(within(balanceRail).getByText("Lake House Weekend")).toBeInTheDocument();
  });

  it("renders loading invite state", () => {
    renderView({ pendingInvitesLoading: true });
    expect(screen.getByText("Loading pending invites...")).toBeInTheDocument();
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
    renderView({ selectedFriendId: "friend-doug" });

    const sectionTabs = within(screen.getByRole("navigation", { name: "Dashboard sections" })).getAllByRole("button");
    const friendStage = screen.getByText("douros03@live.com").closest(".dashboard-friend-stage");
    const groupsPanel = screen.getByRole("heading", { name: "Groups" }).closest(".dashboard-mobile-panel");
    const balanceRail = screen.getByText("Your balance").closest(".dashboard-balance-rail");

    expect(sectionTabs[0]).toHaveTextContent("Groups");
    expect(sectionTabs.map((tab) => tab.textContent)).toEqual(["Groups", "Balance", "Invites", "Friends"]);
    expect(groupsPanel).toHaveClass("is-active");
    expect(friendStage).not.toHaveClass("is-active");
    expect(balanceRail).not.toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Balance" }));

    expect(balanceRail).toHaveClass("is-active");
    expect(groupsPanel).not.toHaveClass("is-active");
    expect(friendStage).not.toHaveClass("is-active");
  });

  it("keeps the selection flow inside the friends panel on mobile", () => {
    const onSelectFriend = vi.fn();
    renderView({ onSelectFriend });

    fireEvent.click(screen.getByRole("button", { name: "Friends" }));
    fireEvent.click(screen.getByRole("button", { name: /Doug Rosenberger/i }));

    const friendsPanel = screen.getByText("Find a friend").closest(".dashboard-mobile-panel");

    expect(onSelectFriend).toHaveBeenCalledWith("friend-doug");
    expect(friendsPanel).toHaveClass("is-active");
    expect(screen.queryByRole("button", { name: "Friend" })).not.toBeInTheDocument();
  });
});
