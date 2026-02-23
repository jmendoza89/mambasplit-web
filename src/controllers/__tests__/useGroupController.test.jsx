import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGroupController } from "../useGroupController";

vi.mock("../../services", () => ({
  groupService: {
    details: vi.fn(async () => ({
      group: { id: "group-1", name: "Trip" },
      members: [],
      expenses: []
    })),
    createEqualExpense: vi.fn(async () => {}),
    delete: vi.fn(async () => {})
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
});
