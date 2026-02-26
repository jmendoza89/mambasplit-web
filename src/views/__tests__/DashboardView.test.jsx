import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardView from "../DashboardView";

function renderView(overrideProps = {}) {
  cleanup();
  const props = {
    currentName: "User",
    currentEmail: "u@example.com",
    currentId: "00000000-0000-4000-8000-000000000001",
    selectedGroupId: "",
    groups: [],
    newGroupName: "",
    inviteEmail: "",
    inviteResult: null,
    sentInvites: [],
    pendingInvites: [],
    pendingInvitesLoading: false,
    pendingInvitesError: "",
    busy: false,
    onOpenGroupPage: vi.fn(),
    onLogout: vi.fn(),
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

  render(<DashboardView {...props} />);
  return props;
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

  it("renders pending invites and refresh action", () => {
    const onRefreshPendingInvites = vi.fn();
    const onAcceptPendingInvite = vi.fn();
    const onDeleteInvite = vi.fn();
    renderView({
      pendingInvites: [{
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        email: "u@example.com",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }],
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        email: "friend@example.com",
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
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onAcceptPendingInvite).toHaveBeenCalledTimes(1);
    expect(onRefreshPendingInvites).toHaveBeenCalledTimes(1);
    expect(onDeleteInvite).toHaveBeenCalledTimes(1);
  });

  it("shows owner and member chips in groups list", () => {
    renderView({
      currentId: "user-1",
      groups: [
        { id: "group-1", name: "Owned Group", createdBy: "user-1" },
        { id: "group-2", name: "Joined Group", createdBy: "user-2" }
      ]
    });

    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("treats role and ownership flags from api payload as owner", () => {
    renderView({
      currentId: "user-1",
      groups: [
        { id: "group-1", name: "Flag Owner", isOwner: true },
        { id: "group-2", name: "Role Owner", userRole: "owner" }
      ]
    });

    expect(screen.getAllByText("Owner")).toHaveLength(2);
  });
});
