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
    listGroupSettlements: vi.fn(async () => ({ settlements: [] })),
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
});
