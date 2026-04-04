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

  it("renders the pending friend in the accordion list", () => {
    renderView({ selectedFriendId: "friend-julio" });

    // Accordion trigger shows name and pending status
    const trigger = screen.getByRole("button", { name: /julio/i });
    expect(within(trigger).getByText("Invite pending")).toBeInTheDocument();
    expect(within(trigger).getByText("Pending")).toBeInTheDocument();
  });

  it("renders the accepted friend accordion expanded with expenses", () => {
    renderView({ selectedFriendId: "friend-doug" });

    // Accordion trigger shows friend name
    const trigger = screen.getByRole("button", { name: /Doug Rosenberger/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Expanded body should show the balance summary and shared expense
    expect(screen.getAllByText("Doug owes you $5.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Love Nest").length).toBeGreaterThan(0);
  });

  it("calls onSelectFriend when a friend is clicked in the sidebar", () => {
    const onSelectFriend = vi.fn();
    renderView({ onSelectFriend });

    fireEvent.click(screen.getByRole("button", { name: /Doug Rosenberger/i }));

    expect(onSelectFriend).toHaveBeenCalledWith("friend-doug");
  });

  it("shows per-group balances and a net summary for Mina", () => {
    renderView({ selectedFriendId: "friend-mina" });

    // Mina's accordion should be expanded showing her expenses
    const trigger = screen.getByRole("button", { name: /Mina Torres/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Balance strip summary
    expect(screen.getByText("You owe Mina $2.30")).toBeInTheDocument();
    expect(screen.getByText("2 shared groups")).toBeInTheDocument();

    // Individual group expenses
    expect(screen.getByText("Summer Euro Trip")).toBeInTheDocument();
    expect(screen.getByText("Lake House Weekend")).toBeInTheDocument();
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
    const groupsPanel = screen.getByRole("heading", { name: "Groups" }).closest(".dashboard-mobile-panel");
    const friendsPanel = screen.getByText("Find a friend").closest(".dashboard-mobile-panel");

    expect(sectionTabs.map((tab) => tab.textContent)).toEqual(["Groups", "Friends"]);
    expect(groupsPanel).toHaveClass("is-active");
    expect(friendsPanel).not.toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Friends" }));

    expect(friendsPanel).toHaveClass("is-active");
    expect(groupsPanel).not.toHaveClass("is-active");
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
