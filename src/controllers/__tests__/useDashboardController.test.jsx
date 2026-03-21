import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardController } from "../useDashboardController";
import { groupService } from "../../services";

vi.mock("../../services", () => ({
  groupService: {
    create: vi.fn(async (name) => ({ id: "g-new", name })),
    createInvite: vi.fn(async () => ({
      id: "invite-new",
      token: "t1",
      sentToEmail: "friend@example.com",
      sentByUserId: "user-1",
      expiresAt: "tomorrow"
    })),
    cancelInviteById: vi.fn(async () => {}),
    cancelInvite: vi.fn(async () => {}),
    listGroupInvites: vi.fn(async () => []),
    details: vi.fn(async () => ({ me: { role: "MEMBER" }, group: { createdBy: "someone-else" } })),
    acceptPendingInviteById: vi.fn(async () => {}),
    listPendingInvitesByEmail: vi.fn(async () => []),
    searchUsers: vi.fn(async () => [])
  }
}));

describe("useDashboardController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("mambasplit_access_token", "test-access-token");
  });

  afterEach(() => {
    localStorage.removeItem("mambasplit_access_token");
  });

  it("creates a group and updates selected group", async () => {
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const setBusy = vi.fn();
    const loadSessionData = vi.fn(async () => {});
    const onOpenGroupPage = vi.fn();

    const { result } = renderHook(() => {
      const [groups, setGroups] = useState([]);
      const [selectedGroupId, setSelectedGroupId] = useState("");
      const dashboard = useDashboardController({
        groups,
        selectedGroupId,
        setGroups,
        setSelectedGroupId,
        setError,
        setSuccess,
        setBusy,
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData,
        onOpenGroupPage
      });
      return { dashboard, selectedGroupId };
    });

    act(() => {
      result.current.dashboard.actions.setNewGroupName("Trip");
    });

    await act(async () => {
      await result.current.dashboard.actions.onCreateGroup({ preventDefault: vi.fn() });
    });

    expect(result.current.selectedGroupId).toBe("g-new");
    expect(setSuccess).toHaveBeenCalledWith("Group created.");
  });

  it("loads pending invites for current email", async () => {
    groupService.listPendingInvitesByEmail.mockResolvedValueOnce([
      {
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "u@example.com",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }
    ]);

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    expect(groupService.listPendingInvitesByEmail).toHaveBeenCalledWith("u@example.com");
    expect(result.current.state.pendingInvites).toHaveLength(1);
    expect(result.current.state.pendingInvites[0].sentToEmail).toBe("u@example.com");
    expect(result.current.state.pendingInvites[0].senderName).toBe("");
    expect(result.current.state.pendingInvites[0].senderEmail).toBe("");
    expect(result.current.state.pendingInvitesError).toBe("");
  });

  it("maps pending invite sender details from inviter fields when available", async () => {
    groupService.listPendingInvitesByEmail.mockResolvedValueOnce([
      {
        id: "invite-1",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "u@example.com",
        inviterName: "Julio",
        inviterEmail: "julio@mambatech.io",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }
    ]);

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    expect(result.current.state.pendingInvites[0].senderName).toBe("Julio");
    expect(result.current.state.pendingInvites[0].senderEmail).toBe("julio@mambatech.io");
  });

  it("hydrates invite cards from the /me payload when explicit sender and recipient fields are present", async () => {
    const me = {
      receivedInvites: [{
        id: "pending-1",
        groupId: "group-1",
        groupName: "Trip",
        sentByUserId: "user-2",
        sentByDisplayName: "Julio",
        sentByEmail: "julio@mambatech.io",
        sentToEmail: "u@example.com",
        expiresAt: "2026-03-01T00:00:00Z",
        createdAt: "2026-02-25T00:00:00Z"
      }],
      sentInvites: [{
        id: "sent-1",
        groupId: "group-1",
        groupName: "Trip",
        sentByUserId: "user-1",
        sentByDisplayName: "Owner",
        sentByEmail: "owner@example.com",
        sentToEmail: "friend@example.com",
        expiresAt: "2026-03-02T00:00:00Z",
        createdAt: "2026-02-26T00:00:00Z"
      }]
    };

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        me,
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
      expect(result.current.state.sentInvites).toHaveLength(1);
    });

    expect(groupService.listPendingInvitesByEmail).not.toHaveBeenCalled();
    expect(groupService.listGroupInvites).not.toHaveBeenCalled();
    expect(result.current.state.pendingInvites[0].senderName).toBe("Julio");
    expect(result.current.state.pendingInvites[0].senderEmail).toBe("julio@mambatech.io");
    expect(result.current.state.pendingInvites[0].sentToEmail).toBe("u@example.com");
    expect(result.current.state.sentInvites[0].sentByDisplayName).toBe("Owner");
    expect(result.current.state.sentInvites[0].sentByEmail).toBe("owner@example.com");
    expect(result.current.state.sentInvites[0].sentToEmail).toBe("friend@example.com");
  });

  it("handles empty pending invite response", async () => {
    groupService.listPendingInvitesByEmail.mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    expect(result.current.state.pendingInvites).toEqual([]);
    expect(result.current.state.pendingInvitesError).toBe("");
  });

  it("sets pending invite error when invite fetch fails", async () => {
    groupService.listPendingInvitesByEmail.mockRejectedValueOnce(new Error("Invite list failed"));

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    expect(result.current.state.pendingInvites).toEqual([]);
    expect(result.current.state.pendingInvitesError).toBe("Invite list failed");
  });

  it("maps sent invites with sentByUserId and sentToEmail, filtering other senders", async () => {
    groupService.listGroupInvites.mockImplementation(async (groupId) => {
      if (groupId === "group-1") {
        return [
          {
            id: "mine-1",
            groupId: "group-1",
            sentToEmail: "friend1@example.com",
            sentByUserId: "user-1",
            createdAt: "2026-03-05T00:00:00Z",
            expiresAt: "2026-03-12T00:00:00Z"
          },
          {
            id: "theirs-1",
            groupId: "group-1",
            sentToEmail: "friend2@example.com",
            sentByUserId: "user-2",
            createdAt: "2026-03-06T00:00:00Z",
            expiresAt: "2026-03-13T00:00:00Z"
          }
        ];
      }

      return [
        {
          id: "legacy-1",
          groupId: "group-2",
          sentToEmail: "legacy@example.com",
          createdAt: "2026-03-04T00:00:00Z",
          expiresAt: "2026-03-11T00:00:00Z"
        }
      ];
    });

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [
          { id: "group-1", name: "Trip" },
          { id: "group-2", name: "Dinner" }
        ],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.sentInvites).toHaveLength(2);
    });

    expect(result.current.state.sentInvites.map((invite) => invite.sentToEmail)).toEqual([
      "friend1@example.com",
      "legacy@example.com"
    ]);
    expect(result.current.state.sentInvites.every((invite) => invite.sentByUserId !== "user-2")).toBe(true);
    expect(groupService.listGroupInvites).toHaveBeenCalledTimes(2);
  });

  it("uses the loaded group name when sent invite payload omits groupName", async () => {
    groupService.listGroupInvites.mockResolvedValueOnce([
      {
        id: "mine-1",
        groupId: "group-1",
        sentToEmail: "friend1@example.com",
        sentByUserId: "user-1",
        createdAt: "2026-03-05T00:00:00Z",
        expiresAt: "2026-03-12T00:00:00Z"
      }
    ]);

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.sentInvites).toHaveLength(1);
    });

    expect(result.current.state.sentInvites[0].groupName).toBe("Trip");
  });

  it("creates invite and updates sender-scoped list without reloading invites", async () => {
    groupService.searchUsers.mockResolvedValueOnce([
      { id: "u1", displayName: "Friend One", email: "friend1@example.com" }
    ]);
    groupService.listGroupInvites.mockResolvedValueOnce([]);
    groupService.createInvite.mockResolvedValueOnce({
      id: "invite-created-1",
      token: "token-created-1",
      expiresAt: "2026-03-20T00:00:00Z"
    });
    const setSuccess = vi.fn();

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess,
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.inviteCandidatesLoading).toBe(false);
    });

    act(() => {
      result.current.actions.setInviteEmail("friend1@example.com");
    });

    await act(async () => {
      await result.current.actions.onCreateInvite({ preventDefault: vi.fn() });
    });

    expect(groupService.createInvite).toHaveBeenCalledWith("group-1", "friend1@example.com");
    expect(groupService.listGroupInvites).toHaveBeenCalledTimes(1);
    expect(result.current.state.sentInvites).toHaveLength(1);
    expect(result.current.state.sentInvites[0].sentToEmail).toBe("friend1@example.com");
    expect(result.current.state.sentInvites[0].sentByUserId).toBe("user-1");
    expect(setSuccess).toHaveBeenCalledWith("Invite created.");
  });

  it("refreshes an invite by deleting and resending it", async () => {
    groupService.listGroupInvites.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000123",
        groupId: "group-1",
        groupName: "Trip",
        sentToEmail: "friend@example.com",
        sentByUserId: "user-1",
        createdAt: "2026-03-01T00:00:00Z",
        expiresAt: "2026-03-08T00:00:00Z"
      }
    ]);
    groupService.createInvite.mockResolvedValueOnce({
      id: "invite-refreshed-1",
      token: "token-refreshed-1",
      expiresAt: "2026-03-20T00:00:00Z"
    });
    const setSuccess = vi.fn();

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess,
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.sentInvites).toHaveLength(1);
    });

    await act(async () => {
      await result.current.actions.onRefreshInvite(result.current.state.sentInvites[0]);
    });

    expect(groupService.cancelInviteById).toHaveBeenCalledWith("group-1", "00000000-0000-4000-8000-000000000123");
    expect(groupService.createInvite).toHaveBeenCalledWith("group-1", "friend@example.com");
    expect(result.current.state.sentInvites).toHaveLength(1);
    expect(result.current.state.sentInvites[0].sentToEmail).toBe("friend@example.com");
    expect(result.current.state.sentInvites[0].id).toBe("invite-refreshed-1");
    expect(setSuccess).toHaveBeenCalledWith("Invite refreshed.");
  });

  it("deletes an invite when token is available and does not force refetch", async () => {
    groupService.listGroupInvites.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000123",
        groupId: "group-1",
        sentToEmail: "friend@example.com",
        sentByUserId: "user-1",
        createdAt: "2026-03-01T00:00:00Z",
        expiresAt: "2026-03-08T00:00:00Z",
        token: null
      }
    ]);

    const setError = vi.fn();
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError,
        setSuccess,
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.sentInvites).toHaveLength(1);
    });

    await act(async () => {
      await result.current.actions.onDeleteInvite(result.current.state.sentInvites[0]);
    });

    expect(groupService.cancelInviteById).toHaveBeenCalledWith("group-1", "00000000-0000-4000-8000-000000000123");
    expect(groupService.cancelInvite).not.toHaveBeenCalled();
    expect(groupService.listGroupInvites).toHaveBeenCalledTimes(1);
    expect(result.current.state.sentInvites).toEqual([]);
    expect(setSuccess).toHaveBeenCalledWith("Invite deleted.");
    expect(setError).toHaveBeenCalledWith("");
  });

  it("accepts a pending invite by id and refreshes groups/invites", async () => {
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const loadSessionData = vi.fn(async () => {});
    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError,
        setSuccess,
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData,
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.onAcceptPendingInvite("invite-1");
    });

    expect(groupService.acceptPendingInviteById).toHaveBeenCalledWith("invite-1");
    expect(loadSessionData).toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith("");
    expect(setSuccess).toHaveBeenCalledWith("Invite accepted. Groups refreshed.");
  });

  it("blocks delete when invite identifier is unavailable", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError,
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.onDeleteInvite({
        groupId: "group-1",
        sentByUserId: "user-1"
      });
    });

    expect(groupService.cancelInviteById).not.toHaveBeenCalled();
    expect(groupService.cancelInvite).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith("Invite identifier is unavailable for this row.");
  });

  it("uses token cancel fallback when invite id is not a uuid", async () => {
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess,
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.onDeleteInvite({
        id: "temp-token-id",
        groupId: "group-1",
        sentByUserId: "user-1",
        token: "token-1"
      });
    });

    expect(groupService.cancelInviteById).not.toHaveBeenCalled();
    expect(groupService.cancelInvite).toHaveBeenCalledWith("group-1", "token-1");
    expect(setSuccess).toHaveBeenCalledWith("Invite deleted.");
  });

  it("blocks delete when invite sender is not current member", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError,
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.onDeleteInvite({
        id: "invite-1",
        groupId: "group-1",
        sentByUserId: "user-2",
        token: "token-1"
      });
    });

    expect(groupService.cancelInviteById).not.toHaveBeenCalled();
    expect(groupService.cancelInvite).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith("Only the member who sent this invite can delete it.");
  });

  it("blocks delete when invite sender is missing (legacy safety)", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useDashboardController({
        groups: [],
        selectedGroupId: "",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError,
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.onDeleteInvite({
        id: "invite-1",
        groupId: "group-1",
        token: "token-1"
      });
    });

    expect(groupService.cancelInviteById).not.toHaveBeenCalled();
    expect(groupService.cancelInvite).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith("Invite sender is unavailable for this row.");
  });

  it("filters out already-sent emails from invite candidates using sentToEmail", async () => {
    groupService.searchUsers.mockResolvedValue([
      { id: "u1", displayName: "Friend One", email: "friend1@example.com" },
      { id: "u2", displayName: "Friend Two", email: "friend2@example.com" }
    ]);
    groupService.listGroupInvites.mockResolvedValueOnce([
      {
        id: "existing-invite-1",
        groupId: "group-1",
        sentToEmail: "friend1@example.com",
        createdAt: "2026-03-01T00:00:00Z",
        expiresAt: "2026-03-08T00:00:00Z"
      }
    ]);

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError: vi.fn(),
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.inviteCandidatesLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.state.inviteCandidates).toHaveLength(1);
    });

    expect(result.current.state.inviteCandidates[0].email).toBe("friend2@example.com");
  });

  it("shows descriptive 409 invite conflict message", async () => {
    groupService.searchUsers.mockResolvedValueOnce([
      { id: "u1", displayName: "Friend One", email: "friend1@example.com" }
    ]);
    groupService.listGroupInvites.mockResolvedValueOnce([]);
    groupService.createInvite.mockRejectedValueOnce({ status: 409, message: "Request failed (409)." });
    const setError = vi.fn();

    const { result } = renderHook(() =>
      useDashboardController({
        groups: [{ id: "group-1", name: "Trip" }],
        selectedGroupId: "group-1",
        setGroups: vi.fn(),
        setSelectedGroupId: vi.fn(),
        setError,
        setSuccess: vi.fn(),
        setBusy: vi.fn(),
        currentId: "user-1",
        currentEmail: "u@example.com",
        loadSessionData: vi.fn(async () => {}),
        onOpenGroupPage: vi.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.state.inviteCandidatesLoading).toBe(false);
    });

    act(() => {
      result.current.actions.setInviteEmail("friend1@example.com");
    });

    await act(async () => {
      await result.current.actions.onCreateInvite({ preventDefault: vi.fn() });
    });

    expect(groupService.listGroupInvites).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith(
      "Could not create invite for friend1@example.com: an active invite already exists for this group, or the user is already a member."
    );
  });
});
