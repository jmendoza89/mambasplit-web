import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppController } from "../useAppController";

let capturedSetBusy = null;

vi.mock("../../api", () => ({
  getStoredUser: vi.fn(() => null)
}));

vi.mock("../../services", () => ({
  fetchSessionData: vi.fn(async () => ({ me: null, groups: [] }))
}));

vi.mock("../useAuthController", () => ({
  useAuthController: vi.fn(() => ({
    isAuthenticated: false,
    onSubmitAuth: vi.fn(),
    onGoogleLogin: vi.fn(),
    onLogout: vi.fn(),
    onToggleAuthMode: vi.fn()
  }))
}));

vi.mock("../useDashboardController", () => ({
  useDashboardController: vi.fn((options) => {
    capturedSetBusy = options.setBusy;
    return {
      state: {
        newGroupName: "",
        inviteEmail: "",
        inviteResult: null,
        sentInvites: [],
        pendingInvites: [],
        pendingInvitesLoading: false,
        pendingInvitesError: "",
        inviteCandidates: [],
        inviteCandidatesLoading: false,
        groupOwnershipById: {}
      },
      actions: {
        onResetDashboardState: vi.fn(),
        setNewGroupName: vi.fn(),
        setInviteEmail: vi.fn(),
        onCreateGroup: vi.fn(),
        onCreateInvite: vi.fn(),
        onAcceptPendingInvite: vi.fn(),
        onDeleteInvite: vi.fn(),
        onRefreshPendingInvites: vi.fn()
      }
    };
  })
}));

vi.mock("../useGroupController", () => ({
  useGroupController: vi.fn(() => ({
    state: {
      groupLoading: false,
      groupError: "",
      isGroupOwner: false,
      displayedGroup: null,
      detailsGroupInfo: null,
      detailsMe: null,
      effectiveMemberCount: 0,
      effectiveMyRole: "",
      expenseCount: 0,
      settlementCount: 0,
      totalSettlementAmount: 0,
      totalExpense: 0,
      displayMembers: [],
      expenses: [],
      settlements: [],
      settlementSuggestions: [],
      isExpenseModalOpen: false,
      isSettleUpModalOpen: false,
      recentSettlementId: "",
      expenseDescription: "",
      expenseAmount: "",
      expensePayerUserId: "",
      expenseSavedStatus: ""
    },
    refs: {
      expenseDescriptionRef: { current: null },
      expenseAmountRef: { current: null }
    },
    actions: {
      onResetGroupState: vi.fn(),
      onOpenGroupPage: vi.fn(),
      setExpenseDescription: vi.fn(),
      setExpenseAmount: vi.fn(),
      setExpensePayerUserId: vi.fn(),
      onCreateExpense: vi.fn(),
      onExpenseDescriptionKeyDown: vi.fn(),
      onOpenExpenseModal: vi.fn(),
      onCloseExpenseModal: vi.fn(),
      onOpenSettleUpModal: vi.fn(),
      onCloseSettleUpModal: vi.fn(),
      onCreateSettlement: vi.fn(),
      onDeleteExpense: vi.fn(),
      onDeleteGroup: vi.fn(),
      onRefreshGroupDetail: vi.fn()
    }
  }))
}));

describe("useAppController password reset flow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    capturedSetBusy = null;
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("supports mock email link -> reset screen -> confirm password", async () => {
    const { result } = renderHook(() => useAppController());

    act(() => {
      result.current.actions.onStartPasswordReset("user@example.com");
    });
    expect(result.current.state.authMode).toBe("resetRequest");
    expect(result.current.state.email).toBe("user@example.com");

    await act(async () => {
      await result.current.actions.onRequestPasswordReset({ preventDefault: vi.fn() });
    });

    const link = result.current.state.passwordResetOutbox?.link;
    expect(link).toBeTruthy();

    act(() => {
      result.current.actions.onOpenPasswordResetLink(link);
    });
    expect(result.current.state.authMode).toBe("resetPassword");
    expect(result.current.state.resetTokenStatus).toBe("valid");

    act(() => {
      result.current.actions.setPassword("new-password-123");
      result.current.actions.setResetConfirmPassword("new-password-123");
    });

    await act(async () => {
      await result.current.actions.onSubmitPasswordReset({ preventDefault: vi.fn() });
    });

    expect(result.current.state.passwordResetTestValue).toBe("new-password-123");
    expect(result.current.state.resetTokenStatus).toBe("used");
  });

  it("keeps busy true until overlapping operations finish", () => {
    const { result } = renderHook(() => useAppController());

    expect(capturedSetBusy).toBeTypeOf("function");
    expect(result.current.state.busy).toBe(false);

    act(() => {
      capturedSetBusy(true);
      capturedSetBusy(true);
    });

    expect(result.current.state.busy).toBe(true);

    act(() => {
      capturedSetBusy(false);
    });

    expect(result.current.state.busy).toBe(true);

    act(() => {
      capturedSetBusy(false);
    });

    expect(result.current.state.busy).toBe(false);
  });

  it("auto-clears success alerts after a short delay", () => {
    const { result } = renderHook(() => useAppController());

    act(() => {
      result.current.actions.onStartPasswordReset("user@example.com");
    });

    expect(result.current.state.success).toBe("");

    act(() => {
      result.current.actions.onOpenPasswordResetLink("https://example.com/?resetToken=");
    });

    expect(result.current.state.success).toBe("");
    expect(result.current.state.error).toBe("Reset link is invalid.");

    act(() => {
      result.current.actions.onSaveAccountProfile({
        displayName: "User",
        email: "user@example.com",
        phone: "",
        avatarUrl: ""
      });
    });

    expect(result.current.state.success).toBe("Account details updated on this device.");

    act(() => {
      vi.advanceTimersByTime(4500);
    });

    expect(result.current.state.success).toBe("");
  });

  it("auto-clears error alerts after a short delay", () => {
    const { result } = renderHook(() => useAppController());

    expect(result.current.state.error).toBe("");

    act(() => {
      result.current.actions.onOpenPasswordResetLink("https://example.com/?resetToken=");
    });

    expect(result.current.state.error).toBe("Reset link is invalid.");

    act(() => {
      vi.advanceTimersByTime(6500);
    });

    expect(result.current.state.error).toBe("");
  });
});
