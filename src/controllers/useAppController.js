import { useCallback, useMemo, useState } from "react";
import { getStoredUser } from "../api";
import { fetchSessionData } from "../services";
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

  const currentName = useMemo(() => (me && me.displayName) || (user && user.displayName) || "User", [me, user]);
  const currentEmail = useMemo(() => (me && me.email) || (user && user.email) || "-", [me, user]);
  const currentId = useMemo(() => (me && me.id) || (user && user.id) || "-", [me, user]);

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

  return {
    state: {
      authMode,
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
      totalExpense: groupController.state.totalExpense,
      displayMembers: groupController.state.displayMembers,
      expenses: groupController.state.expenses,
      isExpenseModalOpen: groupController.state.isExpenseModalOpen,
      expenseDescription: groupController.state.expenseDescription,
      expenseAmount: groupController.state.expenseAmount,
      expenseSavedStatus: groupController.state.expenseSavedStatus,
      newGroupName: dashboardController.state.newGroupName,
      inviteEmail: dashboardController.state.inviteEmail,
      acceptToken: dashboardController.state.acceptToken,
      inviteResult: dashboardController.state.inviteResult,
      displayName,
      email,
      password
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
      setAcceptToken: dashboardController.actions.setAcceptToken,
      setExpenseDescription: groupController.actions.setExpenseDescription,
      setExpenseAmount: groupController.actions.setExpenseAmount,
      setDisplayName,
      setEmail,
      setPassword,
      onToggleAuthMode: authController.onToggleAuthMode,
      onSubmitAuth: authController.onSubmitAuth,
      onLogout: authController.onLogout,
      onCreateGroup: dashboardController.actions.onCreateGroup,
      onCreateInvite: dashboardController.actions.onCreateInvite,
      onAcceptInvite: dashboardController.actions.onAcceptInvite,
      onOpenGroupPage: groupController.actions.onOpenGroupPage,
      onCreateExpense: groupController.actions.onCreateExpense,
      onExpenseDescriptionKeyDown: groupController.actions.onExpenseDescriptionKeyDown,
      onOpenExpenseModal: groupController.actions.onOpenExpenseModal,
      onCloseExpenseModal: groupController.actions.onCloseExpenseModal,
      onDeleteGroup: groupController.actions.onDeleteGroup,
      onRefreshGroupDetail: groupController.actions.onRefreshGroupDetail
    }
  };
}
