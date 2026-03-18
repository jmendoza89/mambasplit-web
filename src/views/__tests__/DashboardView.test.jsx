import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    onCreateGroup: vi.fn((e) => e.preventDefault()),
    onCreateInvite: vi.fn((e) => e.preventDefault()),
    onAcceptPendingInvite: vi.fn(),
    onDeleteInvite: vi.fn(),
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

  it("renders sent invite recipient with legacy fallback", () => {
    renderView({
      sentInvites: [{
        id: "sent-legacy-1",
        groupId: "group-1",
        groupName: "Trip",
        email: "legacy@example.com",
        token: "token-legacy-1",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }]
    });

    expect(screen.getByText("legacy@example.com")).toBeInTheDocument();
  });

  it("renders pending invites and refresh action", () => {
    const onRefreshPendingInvites = vi.fn();
    const onAcceptPendingInvite = vi.fn();
    const onDeleteInvite = vi.fn();
    renderView({
      pendingInvites: [{
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "u@example.com",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }],
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
      onAcceptPendingInvite,
      onRefreshPendingInvites,
      onDeleteInvite
    });

    expect(screen.getAllByText("Trip").length).toBeGreaterThan(0);
    expect(screen.getAllByText("u@example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("To:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onAcceptPendingInvite).toHaveBeenCalledTimes(1);
    expect(onRefreshPendingInvites).toHaveBeenCalledTimes(1);
    expect(onDeleteInvite).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText("To:")).toBeInTheDocument();
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
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Only the member who sent this invite can delete it.");
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
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Invite sender is unavailable for this row.");
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
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Invite identifier is unavailable for this row.");
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
