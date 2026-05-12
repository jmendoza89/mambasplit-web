import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { groupService } from "../../services";
import { useGroupController } from "../useGroupController";

vi.mock("../../services", () => ({
  groupService: {
    details: vi.fn(async () => ({
      group: { id: "group-1", name: "Trip" },
      members: [],
      expenses: []
    })),
    detailsWithMetadata: vi.fn(async () => ({
      data: {
        group: { id: "group-1", name: "Trip" },
        members: [],
        expenses: []
      },
      metadata: null
    })),
    listExpenses: vi.fn(async () => ({ expenses: [], hasMoreExpenses: false, nextBefore: null })),
    listGroupSettlements: vi.fn(async () => ({ settlements: [] })),
    listSettlementExpenses: vi.fn(async () => ({ expenses: [], hasMoreExpenses: false, nextBefore: null })),
    createEqualExpense: vi.fn(async () => {}),
    deleteExpense: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    leaveGroup: vi.fn(async () => {})
  }
}));

describe("useGroupController", () => {
  it("validates payer id before creating an expense", async () => {
    const setGroupError = vi.fn();
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const setBusy = vi.fn();

    const { result } = renderHook(() =>
      useGroupController({
        activeView: "dashboard",
        setActiveView: vi.fn(),
        groups: [{ id: "group-1", name: "Trip" }],
        setGroups: vi.fn(),
        selectedGroupId: "group-1",
        setSelectedGroupId: vi.fn(),
        groupDetail: null,
        setGroupDetail: vi.fn(),
        groupDetailStatusById: {},
        setGroupDetailStatusById: vi.fn(),
        setGroupError,
        setError,
        setSuccess,
        setBusy,
        currentId: "not-a-uuid",
        currentName: "User",
        currentEmail: "u@example.com"
      })
    );

    act(() => {
      result.current.actions.setExpenseDescription("Dinner");
      result.current.actions.setExpenseAmount("20");
    });

    await act(async () => {
      await result.current.actions.onCreateExpense({ preventDefault: vi.fn() });
    });

    expect(setError).toHaveBeenCalledWith("Could not determine current user id for payer.");
  });

  it("deletes an expense owned by the current user", async () => {
    const setGroupError = vi.fn();
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const setBusy = vi.fn();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() =>
      useGroupController({
        activeView: "dashboard",
        setActiveView: vi.fn(),
        groups: [{
          id: "group-1",
          name: "Trip",
          expenses: [{
            id: "expense-1",
            description: "Dinner",
            amountCents: 1000,
            payerUserId: "00000000-0000-4000-8000-000000000001"
          }]
        }],
        setGroups: vi.fn(),
        selectedGroupId: "group-1",
        setSelectedGroupId: vi.fn(),
        groupDetail: null,
        setGroupDetail: vi.fn(),
        groupDetailStatusById: {},
        setGroupDetailStatusById: vi.fn(),
        setGroupError,
        setError,
        setSuccess,
        setBusy,
        currentId: "00000000-0000-4000-8000-000000000001",
        currentName: "User",
        currentEmail: "u@example.com"
      })
    );

    await act(async () => {
      await result.current.actions.onDeleteExpense("expense-1");
    });

    expect(setSuccess).toHaveBeenCalledWith("Expense deleted.");
  });

  it("blocks deleting an expense linked to a settlement", async () => {
    const setGroupError = vi.fn();
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const setBusy = vi.fn();

    const { result } = renderHook(() =>
      useGroupController({
        activeView: "dashboard",
        setActiveView: vi.fn(),
        groups: [{
          id: "group-1",
          name: "Trip",
          expenses: [{
            id: "expense-1",
            description: "Dinner",
            amountCents: 1000,
            payerUserId: "00000000-0000-4000-8000-000000000001",
            settlementId: "70000000-0000-4000-8000-000000000001",
            isSettled: true
          }],
          settlements: [{
            id: "70000000-0000-4000-8000-000000000001",
            expenseIds: ["expense-1"]
          }]
        }],
        setGroups: vi.fn(),
        selectedGroupId: "group-1",
        setSelectedGroupId: vi.fn(),
        groupDetail: null,
        setGroupDetail: vi.fn(),
        groupDetailStatusById: {},
        setGroupDetailStatusById: vi.fn(),
        setGroupError,
        setError,
        setSuccess,
        setBusy,
        currentId: "00000000-0000-4000-8000-000000000001",
        currentName: "User",
        currentEmail: "u@example.com"
      })
    );

    await act(async () => {
      await result.current.actions.onDeleteExpense("expense-1");
    });

    expect(setError).toHaveBeenCalledWith("Settled expenses cannot be deleted.");
  });

  it("surfaces backend 409 conflict when expense is still present and unsettled", async () => {
    const setGroupError = vi.fn();
    const setError = vi.fn();
    const setSuccess = vi.fn();
    const setBusy = vi.fn();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    groupService.details.mockResolvedValue({
      group: { id: "group-1", name: "Trip" },
      expenses: [{
        id: "expense-1",
        description: "Dinner",
        amountCents: 1000,
        payerUserId: "00000000-0000-4000-8000-000000000001"
      }],
      settlements: []
    });
    groupService.listGroupSettlements.mockResolvedValue({ settlements: [] });
    groupService.deleteExpense.mockRejectedValueOnce({ status: 409, message: "conflict" });

    const { result } = renderHook(() =>
      useGroupController({
        activeView: "dashboard",
        setActiveView: vi.fn(),
        groups: [{
          id: "group-1",
          name: "Trip",
          expenses: [{
            id: "expense-1",
            description: "Dinner",
            amountCents: 1000,
            payerUserId: "00000000-0000-4000-8000-000000000001"
          }]
        }],
        setGroups: vi.fn(),
        selectedGroupId: "group-1",
        setSelectedGroupId: vi.fn(),
        groupDetail: null,
        setGroupDetail: vi.fn(),
        groupDetailStatusById: {},
        setGroupDetailStatusById: vi.fn(),
        setGroupError,
        setError,
        setSuccess,
        setBusy,
        currentId: "00000000-0000-4000-8000-000000000001",
        currentName: "User",
        currentEmail: "u@example.com"
      })
    );

    await act(async () => {
      await result.current.actions.onDeleteExpense("expense-1");
    });

    expect(setError).toHaveBeenCalledWith("conflict");
  });

  function makeHookArgs(overrides = {}) {
    return {
      activeView: "group",
      setActiveView: vi.fn(),
      groups: [{ id: "group-1", name: "Trip" }],
      setGroups: vi.fn(),
      selectedGroupId: "group-1",
      setSelectedGroupId: vi.fn(),
      groupDetail: { group: { id: "group-1" }, members: [], expenses: [] },
      setGroupDetail: vi.fn(),
      groupDetailStatusById: {},
      setGroupDetailStatusById: vi.fn(),
      setGroupError: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      setBusy: vi.fn(),
      currentId: "00000000-0000-4000-8000-000000000001",
      currentName: "User",
      currentEmail: "u@example.com",
      ...overrides
    };
  }

  it("onOpenLeaveGroupModal sets isLeaveGroupModalOpen to true", () => {
    const { result } = renderHook(() => useGroupController(makeHookArgs()));

    act(() => { result.current.actions.onOpenLeaveGroupModal(); });

    expect(result.current.state.isLeaveGroupModalOpen).toBe(true);
  });

  it("onCancelLeaveGroup sets isLeaveGroupModalOpen to false", () => {
    const { result } = renderHook(() => useGroupController(makeHookArgs()));

    act(() => { result.current.actions.onOpenLeaveGroupModal(); });
    act(() => { result.current.actions.onCancelLeaveGroup(); });

    expect(result.current.state.isLeaveGroupModalOpen).toBe(false);
  });

  it("onConfirmLeaveGroup calls groupService.leaveGroup with the selected group id", async () => {
    const setActiveView = vi.fn();
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useGroupController(makeHookArgs({ setActiveView, setSuccess }))
    );

    await act(async () => {
      await result.current.actions.onConfirmLeaveGroup();
    });

    expect(groupService.leaveGroup).toHaveBeenCalledWith("group-1");
  });

  it("onConfirmLeaveGroup navigates to dashboard and shows success message on success", async () => {
    const setActiveView = vi.fn();
    const setSuccess = vi.fn();
    groupService.leaveGroup.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useGroupController(makeHookArgs({ setActiveView, setSuccess }))
    );

    await act(async () => {
      await result.current.actions.onConfirmLeaveGroup();
    });

    expect(setActiveView).toHaveBeenCalledWith("dashboard");
    expect(setSuccess).toHaveBeenCalledWith("You have left the group.");
  });

  it("onConfirmLeaveGroup shows error and closes modal on failure", async () => {
    const setError = vi.fn();
    const setActiveView = vi.fn();
    groupService.leaveGroup.mockRejectedValueOnce({ message: "You cannot leave your own group." });

    const { result } = renderHook(() =>
      useGroupController(makeHookArgs({ setError, setActiveView }))
    );

    await act(async () => {
      await result.current.actions.onConfirmLeaveGroup();
    });

    expect(setError).toHaveBeenCalledWith("You cannot leave your own group.");
    expect(setActiveView).not.toHaveBeenCalledWith("dashboard");
    expect(result.current.state.isLeaveGroupModalOpen).toBe(false);
  });

  it("onConfirmLeaveGroup removes the left group from the groups list on success", async () => {
    const setGroups = vi.fn();
    groupService.leaveGroup.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useGroupController(makeHookArgs({ setGroups }))
    );

    await act(async () => {
      await result.current.actions.onConfirmLeaveGroup();
    });

    expect(setGroups).toHaveBeenCalled();
    const calledWith = setGroups.mock.calls[0][0];
    expect(Array.isArray(calledWith)).toBe(true);
    expect(calledWith.find((g) => g.id === "group-1")).toBeUndefined();
  });

  it("loads older expenses and appends them to group detail", async () => {
    const setGroupDetail = vi.fn();
    groupService.detailsWithMetadata.mockResolvedValueOnce({
      data: {
        group: { id: "group-1", name: "Trip" },
        members: [],
        expenses: [{ id: "expense-1", createdAt: "2026-05-08T12:00:00Z" }],
        hasMoreExpenses: true
      },
      metadata: null
    });
    groupService.listExpenses.mockResolvedValueOnce({
      expenses: [{ id: "expense-2", createdAt: "2026-05-07T12:00:00Z" }],
      hasMoreExpenses: false,
      nextBefore: null
    });

    const { result } = renderHook(() =>
      useGroupController(makeHookArgs({
        activeView: "dashboard",
        groupDetail: null,
        setGroupDetail
      }))
    );

    await act(async () => {
      await result.current.actions.onOpenGroupPage("group-1");
    });
    await act(async () => {
      await result.current.actions.onLoadOlderExpenses();
    });

    expect(groupService.listExpenses).toHaveBeenCalledWith("group-1", {
      before: "2026-05-08T12:00:00Z",
      limit: 25
    });
    const updater = setGroupDetail.mock.calls.at(-1)[0];
    expect(updater({ expenses: [{ id: "expense-1" }] }).expenses).toEqual([
      { id: "expense-1" },
      { id: "expense-2", createdAt: "2026-05-07T12:00:00Z" }
    ]);
  });

  it("loads more settlement metadata rows", async () => {
    const setGroupDetail = vi.fn();
    groupService.detailsWithMetadata.mockResolvedValueOnce({
      data: {
        group: { id: "group-1", name: "Trip" },
        members: [],
        expenses: [],
        settlements: [{ id: "settlement-1", settledAt: "2026-05-08T12:00:00Z" }],
        hasMoreSettlements: true
      },
      metadata: null
    });
    groupService.listGroupSettlements.mockResolvedValueOnce({
      settlements: [{ id: "settlement-2", settledAt: "2026-05-07T12:00:00Z" }],
      hasMoreSettlements: false,
      nextBefore: null
    });

    const { result } = renderHook(() =>
      useGroupController(makeHookArgs({
        activeView: "dashboard",
        groupDetail: null,
        setGroupDetail
      }))
    );

    await act(async () => {
      await result.current.actions.onOpenGroupPage("group-1");
    });
    await act(async () => {
      await result.current.actions.onLoadMoreSettlements();
    });

    expect(groupService.listGroupSettlements).toHaveBeenCalledWith("group-1", {
      before: "2026-05-08T12:00:00Z",
      limit: 5
    });
    const updater = setGroupDetail.mock.calls.at(-1)[0];
    expect(updater({ settlements: [{ id: "settlement-1" }] }).settlements).toEqual([
      { id: "settlement-1" },
      { id: "settlement-2", settledAt: "2026-05-07T12:00:00Z" }
    ]);
  });

  it("loads linked expenses for one settlement", async () => {
    groupService.listSettlementExpenses.mockResolvedValueOnce({
      expenses: [{
        id: "expense-1",
        description: "Dinner",
        amountCents: 1200,
        payerUserId: "00000000-0000-4000-8000-000000000001",
        createdAt: "2026-05-08T12:00:00Z",
        splits: []
      }],
      hasMoreExpenses: true,
      nextBefore: "2026-05-08T12:00:00Z"
    });

    const { result } = renderHook(() => useGroupController(makeHookArgs()));

    await act(async () => {
      await result.current.actions.onLoadSettlementExpenses("settlement-1");
    });

    expect(groupService.listSettlementExpenses).toHaveBeenCalledWith("group-1", "settlement-1", {
      before: null,
      limit: 25
    });
    expect(result.current.state.settlementExpensePages["settlement-1"].expenses).toHaveLength(1);
    expect(result.current.state.settlementExpensePages["settlement-1"].hasMoreExpenses).toBe(true);
  });
});
