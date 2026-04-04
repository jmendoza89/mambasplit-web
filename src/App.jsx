import { motion } from "motion/react";
import { useMemo } from "react";
import { AlertContext } from "./contexts/AlertContext";
import { AuthContext } from "./contexts/AuthContext";
import { useAppController } from "./controllers/useAppController";
import AuthView from "./views/AuthView";
import DashboardView from "./views/DashboardView";
import ExpenseModal from "./views/ExpenseModal";
import GroupView from "./views/GroupView";
import AccountView from "./views/AccountView";
import { itemVariants, listVariants } from "./views/animations";
import Alerts from "./views/components/Alerts";
import Header from "./views/components/Header";

export default function App() {
  const { state, actions, refs } = useAppController();

  // Memoize context values to prevent unnecessary re-renders
  const authContextValue = useMemo(() => ({
    user: state.user,
    me: state.me,
    isAuthenticated: state.isAuthenticated,
    currentName: state.currentName,
    currentEmail: state.currentEmail,
    currentPhone: state.currentPhone,
    currentId: state.currentId,
    currentAvatarUrl: state.currentAvatarUrl,
    authMode: state.authMode,
    email: state.email,
    password: state.password,
    resetConfirmPassword: state.resetConfirmPassword,
    resetTokenStatus: state.resetTokenStatus,
    passwordResetOutbox: state.passwordResetOutbox,
    passwordResetTestValue: state.passwordResetTestValue,
    showResetTestHarness: state.showResetTestHarness,
    displayName: state.displayName,
    setAuthMode: actions.setAuthMode,
    setEmail: actions.setEmail,
    setPassword: actions.setPassword,
    setResetConfirmPassword: actions.setResetConfirmPassword,
    setDisplayName: actions.setDisplayName,
    onSubmitAuth: actions.onSubmitAuth,
    onGoogleLogin: actions.onGoogleLogin,
    googleButtonStatus: state.googleButtonStatus,
    onLogout: actions.onLogout,
    onToggleAuthMode: actions.onToggleAuthMode,
    onStartPasswordReset: actions.onStartPasswordReset,
    onReturnToLogin: actions.onReturnToLogin,
    onRequestPasswordReset: actions.onRequestPasswordReset,
    onOpenPasswordResetLink: actions.onOpenPasswordResetLink,
    onSubmitPasswordReset: actions.onSubmitPasswordReset
  }), [
    state.user,
    state.me,
    state.isAuthenticated,
    state.currentName,
    state.currentEmail,
    state.currentPhone,
    state.currentId,
    state.currentAvatarUrl,
    state.authMode,
    state.email,
    state.password,
    state.resetConfirmPassword,
    state.resetTokenStatus,
    state.passwordResetOutbox,
    state.passwordResetTestValue,
    state.showResetTestHarness,
    state.displayName,
    actions.setAuthMode,
    actions.setEmail,
    actions.setPassword,
    actions.setResetConfirmPassword,
    actions.setDisplayName,
    actions.onSubmitAuth,
    actions.onGoogleLogin,
    state.googleButtonStatus,
    actions.onLogout,
    actions.onToggleAuthMode,
    actions.onStartPasswordReset,
    actions.onReturnToLogin,
    actions.onRequestPasswordReset,
    actions.onOpenPasswordResetLink,
    actions.onSubmitPasswordReset
  ]);

  const alertContextValue = useMemo(() => ({
    error: state.error,
    success: state.success,
    busy: state.busy,
    setError: () => { /* handled in controller */ },
    setSuccess: () => { /* handled in controller */ },
    setBusy: () => { /* handled in controller */ },
    clearAlerts: () => { /* handled in controller */ }
  }), [state.error, state.success, state.busy]);

  if (state.loading) {
    return (
      <motion.main
        className="app-shell"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Header />
        <section className="card panel">Loading...</section>
      </motion.main>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <AlertContext.Provider value={alertContextValue}>
        <div className="page-bg" />
        <div className="orb orb-a" />
        <div className="orb orb-b" />

        <motion.main
          className="app-shell"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <Header />
          <Alerts error={state.error} success={state.success} />

          {!state.isAuthenticated || state.isResetAuthMode ? (
            <AuthView />
          ) : state.activeView === "dashboard" ? (
          <DashboardView
            selectedGroupId={state.selectedGroupId}
            groups={state.groups}
            newGroupName={state.newGroupName}
            pendingInvites={state.pendingInvites}
            pendingInvitesLoading={state.pendingInvitesLoading}
            pendingInvitesError={state.pendingInvitesError}
            groupOwnershipById={state.groupOwnershipById}
            friendDirectory={state.friendDirectory}
            friendsLoading={state.friendsLoading}
            friendsError={state.friendsError}
            selectedFriendId={state.selectedFriendId}
            onOpenGroupPage={actions.onOpenGroupPage}
            onOpenAccount={() => actions.setActiveView("account")}
            onSelectFriend={actions.onSelectFriend}
            onCreateGroup={actions.onCreateGroup}
            onAcceptPendingInvite={actions.onAcceptPendingInvite}
            onRefreshPendingInvites={actions.onRefreshPendingInvites}
            setSelectedGroupId={actions.setSelectedGroupId}
            setNewGroupName={actions.setNewGroupName}
          />
        ) : state.activeView === "account" ? (
          <AccountView
            currentName={state.currentName}
            currentEmail={state.currentEmail}
            currentPhone={state.currentPhone}
            currentAvatarUrl={state.currentAvatarUrl}
            hasGoogleLogin={state.currentHasGoogleLogin}
            busy={state.busy}
            onBackToDashboard={() => actions.setActiveView("dashboard")}
            onSaveAccountProfile={actions.onSaveAccountProfile}
            onChangePassword={actions.onChangePassword}
          />
        ) : (
          <GroupView
            selectedGroupId={state.selectedGroupId}
            groupLoading={state.groupLoading}
            isGroupOwner={state.isGroupOwner}
            displayedGroup={state.displayedGroup}
            detailsGroupInfo={state.detailsGroupInfo}
            detailsMe={state.detailsMe}
            effectiveMemberCount={state.effectiveMemberCount}
            expenseCount={state.expenseCount}
            settlementCount={state.settlementCount}
            totalExpense={state.totalExpense}
            totalSettlementAmount={state.totalSettlementAmount}
            effectiveMyRole={state.effectiveMyRole}
            groupError={state.groupError}
            displayMembers={state.displayMembers}
            expenses={state.expenses}
            settlements={state.settlements}
            settlementSuggestions={state.settlementSuggestions}
            recentSettlementId={state.recentSettlementId}
            listVariants={listVariants}
            itemVariants={itemVariants}
            sentInvites={state.sentInvites}
            inviteResult={state.inviteResult}
            onBackToDashboard={() => actions.setActiveView("dashboard")}
            onCreateInvite={actions.onCreateInvite}
            onDeleteInvite={actions.onDeleteInvite}
            onRefreshInvite={actions.onRefreshInvite}
            onOpenExpenseModal={actions.onOpenExpenseModal}
            onOpenSettleUpModal={actions.onOpenSettleUpModal}
            onCloseSettleUpModal={actions.onCloseSettleUpModal}
            onCreateSettlement={actions.onCreateSettlement}
            isSettleUpModalOpen={state.isSettleUpModalOpen}
            onDeleteExpense={actions.onDeleteExpense}
            onRefreshGroupDetail={actions.onRefreshGroupDetail}
            onDeleteGroup={actions.onDeleteGroup}
            isLeaveGroupModalOpen={state.isLeaveGroupModalOpen}
            onOpenLeaveGroupModal={actions.onOpenLeaveGroupModal}
            onCancelLeaveGroup={actions.onCancelLeaveGroup}
            onConfirmLeaveGroup={actions.onConfirmLeaveGroup}
          />
        )}
      </motion.main>

      <ExpenseModal
        isOpen={state.isExpenseModalOpen}
        expenseDescription={state.expenseDescription}
        expenseAmount={state.expenseAmount}
        expensePayerUserId={state.expensePayerUserId}
        expenseSavedStatus={state.expenseSavedStatus}
        currentName={state.currentName}
        participantCount={state.effectiveMemberCount}
        groupName={state.detailsGroupInfo?.name || state.displayedGroup?.name || "Group"}
        members={state.displayMembers}
        groupLoading={state.groupLoading}
        selectedGroupId={state.selectedGroupId}
        expenseDescriptionRef={refs.expenseDescriptionRef}
        expenseAmountRef={refs.expenseAmountRef}
        onClose={actions.onCloseExpenseModal}
        onCreateExpense={actions.onCreateExpense}
        onExpenseDescriptionKeyDown={actions.onExpenseDescriptionKeyDown}
        setExpenseDescription={actions.setExpenseDescription}
        setExpenseAmount={actions.setExpenseAmount}
        setExpensePayerUserId={actions.setExpensePayerUserId}
      />
    </AlertContext.Provider>
    </AuthContext.Provider>
  );
}
