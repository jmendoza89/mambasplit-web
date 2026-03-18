import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredUser } from "../api";
import { fetchSessionData } from "../services";
import {
  consumeMockPasswordResetToken,
  createMockPasswordResetRequest,
  getLatestMockPasswordResetResult,
  verifyMockPasswordResetToken
} from "../services/mockPasswordResetService";
import { useAuthController } from "./useAuthController";
import { useDashboardController } from "./useDashboardController";
import { useGroupController } from "./useGroupController";

export function useAppController() {
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [user, setUser] = useState(getStoredUser());
  const [me, setMe] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [activeView, setActiveView] = useState("dashboard");

  const [groupDetail, setGroupDetail] = useState(null);
  const [groupDetailStatusById, setGroupDetailStatusById] = useState({});
  const [groupError, setGroupError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetTokenStatus, setResetTokenStatus] = useState("idle");
  const [passwordResetOutbox, setPasswordResetOutbox] = useState(null);
  const [passwordResetTestValue, setPasswordResetTestValue] = useState("");

  const currentName = useMemo(() => (me && me.displayName) || (user && user.displayName) || "User", [me, user]);
  const currentEmail = useMemo(() => (me && me.email) || (user && user.email) || "-", [me, user]);
  const currentId = useMemo(() => (me && me.id) || (user && user.id) || "-", [me, user]);
  const showResetTestHarness = useMemo(
    () => import.meta.env.MODE !== "production" || import.meta.env.VITE_ENABLE_RESET_TEST_HARNESS === "true",
    []
  );
  const isResetAuthMode = authMode === "resetRequest" || authMode === "resetPassword";

  const loadSessionData = useCallback(async () => {
    const { me: meData, groups: groupData } = await fetchSessionData();
    setMe(meData);
    localStorage.setItem("mambasplit_user", JSON.stringify(meData));
    setGroups(groupData);
    setSelectedGroupId((prev) => {
      if (prev && groupData.some((group) => group.id === prev)) return prev;
      return (groupData[0] && groupData[0].id) || "";
    });
  }, []);

  const groupController = useGroupController({
    activeView,
    setActiveView,
    groups,
    setGroups,
    selectedGroupId,
    setSelectedGroupId,
    groupDetail,
    setGroupDetail,
    groupDetailStatusById,
    setGroupDetailStatusById,
    setGroupError,
    setError,
    setSuccess,
    setBusy,
    currentId,
    currentName,
    currentEmail
  });

  const dashboardController = useDashboardController({
    groups,
    selectedGroupId,
    setGroups,
    setSelectedGroupId,
    setError,
    setSuccess,
    setBusy,
    currentId,
    currentEmail,
    loadSessionData,
    onOpenGroupPage: groupController.actions.onOpenGroupPage
  });

  const authController = useAuthController({
    authMode,
    email,
    password,
    displayName,
    setLoading,
    setError,
    setSuccess,
    setBusy,
    setUser,
    setMe,
    setGroups,
    setSelectedGroupId,
    setGroupDetail,
    setGroupError,
    setGroupDetailStatusById,
    setActiveView,
    setAuthMode,
    loadSessionData,
    onResetDashboardState: dashboardController.actions.onResetDashboardState,
    onResetGroupState: groupController.actions.onResetGroupState
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("resetToken") || "";
    if (!tokenFromUrl) return;

    const verification = verifyMockPasswordResetToken(tokenFromUrl);
    setResetToken(tokenFromUrl);
    setResetTokenStatus(verification.status);
    if (verification.email) {
      setEmail(verification.email);
    }
    setAuthMode("resetPassword");
  }, []);

  const onStartPasswordReset = useCallback((prefillEmail = "") => {
    setError("");
    setSuccess("");
    setPassword("");
    setResetConfirmPassword("");
    setResetToken("");
    setResetTokenStatus("idle");
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
    setAuthMode("resetRequest");
  }, [setAuthMode]);

  const onReturnToLogin = useCallback(() => {
    setError("");
    setSuccess("");
    setPassword("");
    setResetConfirmPassword("");
    setResetToken("");
    setResetTokenStatus("idle");
    setAuthMode("login");
    const nextQuery = new URLSearchParams(window.location.search);
    nextQuery.delete("resetToken");
    const queryString = nextQuery.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${queryString ? `?${queryString}` : ""}`);
  }, [setAuthMode]);

  const onRequestPasswordReset = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const request = createMockPasswordResetRequest(email);
      setPasswordResetOutbox(request);
      setPasswordResetTestValue("");
      setSuccess("If an account exists, a password reset link has been sent.");
    } catch {
      setError("Unable to generate a reset link in test mode.");
    } finally {
      setBusy(false);
    }
  }, [email]);

  const onOpenPasswordResetLink = useCallback((link) => {
    setError("");
    setSuccess("");

    const parsed = new URL(link, window.location.origin);
    const nextToken = parsed.searchParams.get("resetToken") || "";
    if (!nextToken) {
      setResetToken("");
      setResetTokenStatus("invalid");
      setAuthMode("resetPassword");
      setError("Reset link is invalid.");
      return;
    }

    const verification = verifyMockPasswordResetToken(nextToken);
    setResetToken(nextToken);
    setResetTokenStatus(verification.status);
    if (verification.email) {
      setEmail(verification.email);
    }
    setAuthMode("resetPassword");
    window.history.pushState({}, "", `/?resetToken=${encodeURIComponent(nextToken)}`);

    if (verification.status === "valid") {
      setSuccess("Reset link verified. Set a new password.");
    } else {
      setError("Reset link is invalid, expired, or already used.");
    }
  }, [setAuthMode]);

  const onSubmitPasswordReset = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetToken) {
      setResetTokenStatus("invalid");
      setError("Reset link is missing.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== resetConfirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setBusy(true);
    try {
      const result = consumeMockPasswordResetToken(resetToken, password);
      setResetTokenStatus(result.status === "reset" ? "used" : result.status);
      if (result.status !== "reset") {
        setError("Reset link is invalid, expired, or already used.");
        return;
      }

      const latest = getLatestMockPasswordResetResult();
      setPasswordResetTestValue(latest?.password || "");
      setPassword("");
      setResetConfirmPassword("");
      setSuccess("Password reset complete in test mode.");
    } finally {
      setBusy(false);
    }
  }, [password, resetConfirmPassword, resetToken]);

  return {
    state: {
      authMode,
      isResetAuthMode,
      loading,
      error,
      success,
      busy,
      isAuthenticated: authController.isAuthenticated,
      activeView,
      groups,
      selectedGroupId,
      currentName,
      currentEmail,
      currentId,
      groupLoading: groupController.state.groupLoading,
      groupError: groupController.state.groupError || groupError,
      isGroupOwner: groupController.state.isGroupOwner,
      displayedGroup: groupController.state.displayedGroup,
      detailsGroupInfo: groupController.state.detailsGroupInfo,
      detailsMe: groupController.state.detailsMe,
      effectiveMemberCount: groupController.state.effectiveMemberCount,
      effectiveMyRole: groupController.state.effectiveMyRole,
      expenseCount: groupController.state.expenseCount,
      settlementCount: groupController.state.settlementCount,
      totalSettlementAmount: groupController.state.totalSettlementAmount,
      totalExpense: groupController.state.totalExpense,
      displayMembers: groupController.state.displayMembers,
      expenses: groupController.state.expenses,
      settlements: groupController.state.settlements,
      settlementSuggestions: groupController.state.settlementSuggestions,
      isExpenseModalOpen: groupController.state.isExpenseModalOpen,
      isSettleUpModalOpen: groupController.state.isSettleUpModalOpen,
      recentSettlementId: groupController.state.recentSettlementId,
      expenseDescription: groupController.state.expenseDescription,
      expenseAmount: groupController.state.expenseAmount,
      expensePayerUserId: groupController.state.expensePayerUserId,
      expenseSavedStatus: groupController.state.expenseSavedStatus,
      newGroupName: dashboardController.state.newGroupName,
      inviteEmail: dashboardController.state.inviteEmail,
      inviteResult: dashboardController.state.inviteResult,
      sentInvites: dashboardController.state.sentInvites,
      pendingInvites: dashboardController.state.pendingInvites,
      pendingInvitesLoading: dashboardController.state.pendingInvitesLoading,
      pendingInvitesError: dashboardController.state.pendingInvitesError,
      inviteCandidates: dashboardController.state.inviteCandidates,
      inviteCandidatesLoading: dashboardController.state.inviteCandidatesLoading,
      groupOwnershipById: dashboardController.state.groupOwnershipById,
      displayName,
      email,
      password,
      resetConfirmPassword,
      resetTokenStatus,
      passwordResetOutbox,
      passwordResetTestValue,
      showResetTestHarness
    },
    refs: {
      expenseDescriptionRef: groupController.refs.expenseDescriptionRef,
      expenseAmountRef: groupController.refs.expenseAmountRef
    },
    actions: {
      setAuthMode,
      setActiveView,
      setSelectedGroupId,
      setNewGroupName: dashboardController.actions.setNewGroupName,
      setInviteEmail: dashboardController.actions.setInviteEmail,
      setExpenseDescription: groupController.actions.setExpenseDescription,
      setExpenseAmount: groupController.actions.setExpenseAmount,
      setExpensePayerUserId: groupController.actions.setExpensePayerUserId,
      setDisplayName,
      setEmail,
      setPassword,
      setResetConfirmPassword,
      onToggleAuthMode: authController.onToggleAuthMode,
      onSubmitAuth: authController.onSubmitAuth,
      onGoogleLogin: authController.onGoogleLogin,
      onLogout: authController.onLogout,
      onStartPasswordReset,
      onReturnToLogin,
      onRequestPasswordReset,
      onOpenPasswordResetLink,
      onSubmitPasswordReset,
      onCreateGroup: dashboardController.actions.onCreateGroup,
      onCreateInvite: dashboardController.actions.onCreateInvite,
      onAcceptPendingInvite: dashboardController.actions.onAcceptPendingInvite,
      onDeleteInvite: dashboardController.actions.onDeleteInvite,
      onRefreshPendingInvites: dashboardController.actions.onRefreshPendingInvites,
      onOpenGroupPage: groupController.actions.onOpenGroupPage,
      onCreateExpense: groupController.actions.onCreateExpense,
      onExpenseDescriptionKeyDown: groupController.actions.onExpenseDescriptionKeyDown,
      onOpenExpenseModal: groupController.actions.onOpenExpenseModal,
      onCloseExpenseModal: groupController.actions.onCloseExpenseModal,
      onOpenSettleUpModal: groupController.actions.onOpenSettleUpModal,
      onCloseSettleUpModal: groupController.actions.onCloseSettleUpModal,
      onCreateSettlement: groupController.actions.onCreateSettlement,
      onDeleteExpense: groupController.actions.onDeleteExpense,
      onDeleteGroup: groupController.actions.onDeleteGroup,
      onRefreshGroupDetail: groupController.actions.onRefreshGroupDetail
    }
  };
}
