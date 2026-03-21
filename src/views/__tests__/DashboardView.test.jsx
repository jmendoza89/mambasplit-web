import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertContext } from "../../contexts/AlertContext";
import { AuthContext } from "../../contexts/AuthContext";
import DashboardView from "../DashboardView";

function renderView(overrideProps = {}, contextOverrides = {}) {
  cleanup();
  const props = {
    selectedGroupId: "",
    groups: [],
    newGroupName: "",
    inviteEmail: "",
    inviteResult: null,
    sentInvites: [],
    pendingInvites: [],
    pendingInvitesLoading: false,
    pendingInvitesError: "",
    groupOwnershipById: {},
    onOpenGroupPage: vi.fn(),
    onOpenAccount: vi.fn(),
    onCreateGroup: vi.fn((e) => e.preventDefault()),
    onCreateInvite: vi.fn((e) => e.preventDefault()),
    onAcceptPendingInvite: vi.fn(),
    onDeleteInvite: vi.fn(),
    onRefreshInvite: vi.fn(),
    onRefreshPendingInvites: vi.fn(),
    setSelectedGroupId: vi.fn(),
    setNewGroupName: vi.fn(),
    setInviteEmail: vi.fn(),
    ...overrideProps
  };

  const authContextValue = {
    currentName: "User",
    currentEmail: "u@example.com",
    currentId: "00000000-0000-4000-8000-000000000001",
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
  
  return { props, authContextValue, alertContextValue };
}

describe("DashboardView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading invite state", () => {
    renderView({ pendingInvitesLoading: true });
    expect(screen.getByText("Loading pending invites...")).toBeInTheDocument();
  });

  it("renders invite error state", () => {
    renderView({ pendingInvitesLoading: false, pendingInvitesError: "Invite fetch failed" });
    expect(screen.getByText("Invite fetch failed")).toBeInTheDocument();
  });

  it("renders empty invite state", () => {
    renderView({ pendingInvitesLoading: false, pendingInvitesError: "", pendingInvites: [] });
    expect(screen.getByText("No pending invites")).toBeInTheDocument();
  });

  it("renders empty sent invite state", () => {
    renderView({ sentInvites: [] });
    expect(screen.getByText("No sent invites")).toBeInTheDocument();
  });

  it("renders sent invite recipient from sentToEmail", () => {
    renderView({
      sentInvites: [{
        id: "sent-legacy-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "legacy@example.com",
        token: "token-legacy-1",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    expect(screen.getByText("legacy@example.com")).toBeInTheDocument();
    // expiry is shown inline as a human-readable label (e.g. "4 days until expire") with full date in a tooltip
    expect(screen.getAllByText("4 days until expire").length).toBeGreaterThan(0);
  });

  it("renders sent invite recipient from explicit invite fields without sender copy", () => {
    renderView({
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        sentByDisplayName: "Owner",
        sentByEmail: "owner@example.com",
        sentToEmail: "friend@example.com",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    expect(screen.getByText("friend@example.com")).toBeInTheDocument();
    expect(screen.queryByText("From:")).not.toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
  });

  it("renders pending invites and refresh action", async () => {
    const onRefreshPendingInvites = vi.fn();
    const onAcceptPendingInvite = vi.fn();
    const onDeleteInvite = vi.fn();
    const onRefreshInvite = vi.fn();
    renderView({
      pendingInvites: [{
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "u@example.com",
        senderName: "Julio",
        senderEmail: "julio@mambatech.io",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }],
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        sentByDisplayName: "User",
        sentByEmail: "u@example.com",
        sentToEmail: "friend@example.com",
        sentByUserId: "00000000-0000-4000-8000-000000000001",
        token: "token-1",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }],
      onAcceptPendingInvite,
      onRefreshPendingInvites,
      onDeleteInvite,
      onRefreshInvite
    });

    expect(screen.getAllByText("Trip").length).toBeGreaterThan(0);
    expect(screen.getByText("Julio")).toBeInTheDocument();
    expect(screen.getByText("julio@mambatech.io")).toBeInTheDocument();
    expect(screen.getByText("friend@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("4 days until expire").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Refresh" })[0]);
    const sentInviteCard = screen.getByText("friend@example.com").closest("li");
    fireEvent.click(within(sentInviteCard).getByRole("button", { name: "Refresh" }));
    expect(screen.getByRole("dialog", { name: "Refresh invite" })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Refresh" }));
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onAcceptPendingInvite).toHaveBeenCalledTimes(1);
    expect(onRefreshPendingInvites).toHaveBeenCalledTimes(1);
    expect(onDeleteInvite).toHaveBeenCalledTimes(1);
    expect(onRefreshInvite).toHaveBeenCalledTimes(1);
  });

  it("opens the account dropdown and navigates to the account page", () => {
    const onOpenAccount = vi.fn();
    renderView({ onOpenAccount });

    fireEvent.click(screen.getByRole("button", { name: "User" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Your Account" }));

    expect(onOpenAccount).toHaveBeenCalledTimes(1);
  });

  it("does not render the last token section", () => {
    renderView({
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "friend@example.com",
        sentByUserId: "00000000-0000-4000-8000-000000000001",
        token: "token-1",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }],
      inviteResult: {
        token: "token-1",
        sentToEmail: "friend@example.com",
        expiresAt: "2026-03-01T00:00:00Z"
      }
    });

    expect(screen.queryByText("Last Token:")).not.toBeInTheDocument();
    expect(screen.getByText("friend@example.com")).toBeInTheDocument();
  });

  it("renders unknown sender fallback when pending invite sender details are unavailable", () => {
    renderView({
      pendingInvites: [{
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "u@example.com",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    expect(screen.getByText("Unknown sender")).toBeInTheDocument();
    expect(screen.queryByText("u@example.com", { selector: ".dashboard-pending-invite-email" })).not.toBeInTheDocument();
  });

  it("disables delete when sender does not match current member", () => {
    renderView({
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "friend@example.com",
        sentByUserId: "00000000-0000-4000-8000-000000000002",
        token: "token-1",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    const refreshButton = screen.getByText("friend@example.com").closest("li").querySelector(".dashboard-sent-invite-refresh");
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Only the member who sent this invite can delete it.");
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("title", "Only the member who sent this invite can refresh it.");
  });

  it("disables delete when sender is missing", () => {
    renderView({
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "friend@example.com",
        token: "token-1",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    const refreshButton = screen.getByText("friend@example.com").closest("li").querySelector(".dashboard-sent-invite-refresh");
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Invite sender is unavailable for this row.");
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("title", "Invite sender is unavailable for this row.");
  });

  it("disables delete when invite identifier is missing", () => {
    renderView({
      sentInvites: [{
        id: "",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "friend@example.com",
        sentByUserId: "00000000-0000-4000-8000-000000000001",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    const refreshButton = screen.getByText("friend@example.com").closest("li").querySelector(".dashboard-sent-invite-refresh");
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Invite identifier is unavailable for this row.");
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("title", "Invite identifier is unavailable for this row.");
  });

  it("shows owner crown only for owned groups", () => {
    renderView(
      {
        groups: [
          { id: "group-1", name: "Owned Group", createdBy: "user-1" },
          { id: "group-2", name: "Joined Group", createdBy: "user-2" }
        ]
      },
      {
        auth: { currentId: "user-1" }
      }
    );

    expect(screen.getAllByLabelText("Group owner")).toHaveLength(1);
  });

  it("renders group balance summaries with owe/get-back messaging", () => {
    renderView(
      {
        groups: [
          { id: "group-1", name: "Trip", netBalanceCents: -300 },
          { id: "group-2", name: "Dinner", netBalanceCents: 450 }
        ]
      }
    );

    expect(screen.getByText("you owe $3.00")).toBeInTheDocument();
    expect(screen.getByText("you get back $4.50")).toBeInTheDocument();
  });

  it("treats role and ownership flags from api payload as owner", () => {
    renderView(
      {
        groups: [
          { id: "group-1", name: "Flag Owner", isOwner: true },
          { id: "group-2", name: "Role Owner", userRole: "owner" }
        ]
      },
      {
        auth: { currentId: "user-1" }
      }
    );

    expect(screen.getAllByLabelText("Group owner")).toHaveLength(2);
  });
});
