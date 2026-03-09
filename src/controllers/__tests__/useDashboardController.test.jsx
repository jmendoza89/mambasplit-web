import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardController } from "../useDashboardController";
import { groupService } from "../../services";

vi.mock("../../services", () => ({
  groupService: {
    create: vi.fn(async (name) => ({ id: "g-new", name })),
    createInvite: vi.fn(async () => ({ token: "t1", email: "friend@example.com", expiresAt: "tomorrow" })),
    cancelInvite: vi.fn(async () => {}),
    details: vi.fn(async () => ({ me: { role: "MEMBER" }, group: { createdBy: "someone-else" } })),
    acceptPendingInviteById: vi.fn(async () => {}),
    listPendingInvitesByEmail: vi.fn(async () => [])
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
        email: "u@example.com",
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
    expect(result.current.state.pendingInvitesError).toBe("");
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

  it("deletes an invite when token is available", async () => {
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
      expect(result.current.state.pendingInvitesLoading).toBe(false);
    });

    await act(async () => {
      await result.current.actions.onDeleteInvite({
        id: "invite-1",
        groupId: "group-1",
        token: "token-1"
      });
    });

    expect(groupService.cancelInvite).toHaveBeenCalledWith("group-1", "token-1");
    expect(setSuccess).toHaveBeenCalledWith("Invite deleted.");
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

  it("blocks delete when token is unavailable", async () => {
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
        groupId: "group-1"
      });
    });

    expect(groupService.cancelInvite).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith("Invite token is unavailable for this row.");
  });
});
