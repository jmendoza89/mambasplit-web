import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStoredUser, meApi } from "../api";
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

const PROFILE_STORAGE_KEY = "mambasplit_account_profile";
const SUCCESS_ALERT_TIMEOUT_MS = 4500;

function getStoredProfile() {
  const fallback = { displayName: "", email: "", phone: "", avatarUrl: "" };
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) return fallback;

  try {
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function useAppController() {
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusyState] = useState(false);
  const busyCountRef = useRef(0);
  const busyTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  const clearBusyWatchdog = useCallback(() => {
    if (busyTimeoutRef.current) {
      clearTimeout(busyTimeoutRef.current);
      busyTimeoutRef.current = null;
    }
  }, []);

  const scheduleBusyWatchdog = useCallback(() => {
    clearBusyWatchdog();
    // Safety watchdog: clear busy if it remains set for too long.
    busyTimeoutRef.current = setTimeout(() => {
      console.warn("Clearing stuck busy state after timeout");
      busyCountRef.current = 0;
      setBusyState(false);
      busyTimeoutRef.current = null;
    }, 30000);
  }, [clearBusyWatchdog]);

  // Track active async work instead of toggling a single boolean so
  // overlapping actions cannot leave the dashboard stuck as busy.
  const setBusy = useCallback((value) => {
    if (value) {
      busyCountRef.current += 1;
      setBusyState(true);
      scheduleBusyWatchdog();
      return;
    }

    busyCountRef.current = Math.max(0, busyCountRef.current - 1);
    if (busyCountRef.current === 0) {
      clearBusyWatchdog();
      setBusyState(false);
    } else {
      setBusyState(true);
      scheduleBusyWatchdog();
    }
  }, [clearBusyWatchdog, scheduleBusyWatchdog]);

  const resetBusyState = useCallback(() => {
    busyCountRef.current = 0;
    clearBusyWatchdog();
    setBusyState(false);
  }, [clearBusyWatchdog]);

  const clearSuccessWatchdog = useCallback(() => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  }, []);

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

  const [accountProfile, setAccountProfile] = useState(() => getStoredProfile());


  const currentName = useMemo(
    () => accountProfile.displayName || (me && me.displayName) || (user && user.displayName) || "User",
    [accountProfile.displayName, me, user]
  );
  const currentEmail = useMemo(
    () => accountProfile.email || (me && me.email) || (user && user.email) || "-",
    [accountProfile.email, me, user]
  );

  const currentPhone = useMemo(() => accountProfile.phone || "", [accountProfile.phone]);
  const currentId = useMemo(() => (me && me.id) || (user && user.id) || "-", [me, user]);
  const currentAvatarUrl = useMemo(() => accountProfile.avatarUrl || "", [accountProfile.avatarUrl]);
  const currentHasGoogleLogin = useMemo(
    () => Boolean((me && me.hasGoogleLogin) || (user && user.hasGoogleLogin)),
    [me, user]
  );





  const showResetTestHarness = useMemo(
    () => import.meta.env.MODE !== "production" || import.meta.env.VITE_ENABLE_RESET_TEST_HARNESS === "true",
    []
  );
  const isResetAuthMode = authMode === "resetRequest" || authMode === "resetPassword";
  useEffect(() => {
    setAccountProfile((prev) => {
      const baseDisplayName = me?.displayName || user?.displayName || "";
      const baseEmail = me?.email || user?.email || "";
      const isDifferentUser = Boolean(prev.email && baseEmail && prev.email !== baseEmail);
      const next = {
        displayName: isDifferentUser ? baseDisplayName : (prev.displayName || baseDisplayName),
        email: isDifferentUser ? baseEmail : (prev.email || baseEmail),
        phone: isDifferentUser ? "" : (prev.phone || ""),
        avatarUrl: isDifferentUser ? "" : (prev.avatarUrl || "")
      };

      if (JSON.stringify(next) === JSON.stringify(prev)) {
        return prev;
      }

      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [me, user]);


  useEffect(() => {
    setAccountProfile((prev) => {
      const baseDisplayName = me?.displayName || user?.displayName || "";
      const baseEmail = me?.email || user?.email || "";
      const isDifferentUser = Boolean(prev.email && baseEmail && prev.email !== baseEmail);
      const next = {
        displayName: isDifferentUser ? baseDisplayName : (prev.displayName || baseDisplayName),
        email: isDifferentUser ? baseEmail : (prev.email || baseEmail),
        phone: isDifferentUser ? "" : (prev.phone || ""),
        avatarUrl: isDifferentUser ? "" : (prev.avatarUrl || "")
      };

      if (JSON.stringify(next) === JSON.stringify(prev)) {
        return prev;
      }

      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [me, user]);


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

  // Cleanup watchdog on unmount
  useEffect(() => {
    return () => {
      resetBusyState();
      clearSuccessWatchdog();
    };
  }, [clearSuccessWatchdog, resetBusyState]);

  useEffect(() => {
    clearSuccessWatchdog();
    if (!success) return undefined;

    successTimeoutRef.current = setTimeout(() => {
      setSuccess("");
      successTimeoutRef.current = null;
    }, SUCCESS_ALERT_TIMEOUT_MS);

    return clearSuccessWatchdog;
  }, [clearSuccessWatchdog, success]);

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
    me,
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
  }, [email, setBusy]);

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
  }, [password, resetConfirmPassword, resetToken, setBusy]);

  // Restore onSaveAccountProfile and onChangePassword definitions
  const onSaveAccountProfile = useCallback((nextProfile) => {
    const normalized = {
      displayName: (nextProfile?.displayName || "").trim(),
      email: (nextProfile?.email || "").trim(),
      phone: (nextProfile?.phone || "").trim(),
      avatarUrl: nextProfile?.avatarUrl || ""
    };

    setAccountProfile(normalized);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
    setUser((prev) => (prev ? {
      ...prev,
      displayName: normalized.displayName || prev.displayName,
      email: normalized.email || prev.email,
      phone: normalized.phone,
      avatarUrl: normalized.avatarUrl
    } : prev));
    setMe((prev) => (prev ? {
      ...prev,
      displayName: normalized.displayName || prev.displayName,
      email: normalized.email || prev.email,
      phone: normalized.phone,
      avatarUrl: normalized.avatarUrl
    } : prev));
    setSuccess("Account details updated on this device.");
    setError("");
  }, [setError, setSuccess, setUser, setMe]);

  const onChangePassword = useCallback(async ({ currentPassword, newPassword }) => {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      await meApi.changePassword(currentPassword, newPassword);
      setSuccess(currentHasGoogleLogin ? "Password saved for this account." : "Password updated.");
    } catch (err) {
      setError(err.message || "Unable to update password.");
      throw err;
    } finally {
      setBusy(false);
    }
  }, [currentHasGoogleLogin, setBusy]);









  return {
    state: {
      authMode,
      isResetAuthMode,
      loading,
      error,
      success,
      busy,
      user,
      me,
      isAuthenticated: authController.isAuthenticated,
      activeView,
      groups,
      selectedGroupId,
      currentName,
      currentEmail,
      currentPhone,
      currentId,
      currentAvatarUrl,
      currentHasGoogleLogin,
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
      isLeaveGroupModalOpen: groupController.state.isLeaveGroupModalOpen,
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
      showResetTestHarness,
      googleButtonStatus: authController.googleButtonStatus
    },
    refs: {
      googleButtonRef: authController.googleButtonRef,
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
      onSaveAccountProfile,
      onChangePassword,

      onCreateGroup: dashboardController.actions.onCreateGroup,
      onCreateInvite: dashboardController.actions.onCreateInvite,
      onAcceptPendingInvite: dashboardController.actions.onAcceptPendingInvite,
      onDeleteInvite: dashboardController.actions.onDeleteInvite,
      onRefreshInvite: dashboardController.actions.onRefreshInvite,
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
      onOpenLeaveGroupModal: groupController.actions.onOpenLeaveGroupModal,
      onCancelLeaveGroup: groupController.actions.onCancelLeaveGroup,
      onConfirmLeaveGroup: groupController.actions.onConfirmLeaveGroup,
      onRefreshGroupDetail: groupController.actions.onRefreshGroupDetail
    }
  };
}
