import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDashboardController } from "../useDashboardController";

vi.mock("../../services", () => ({
  groupService: {
    create: vi.fn(async (name) => ({ id: "g-new", name })),
    createInvite: vi.fn(async () => ({ token: "t1", email: "friend@example.com", expiresAt: "tomorrow" })),
    acceptInvite: vi.fn(async () => {})
  }
}));

describe("useDashboardController", () => {
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
});
