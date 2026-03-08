import { motion } from "motion/react";
import { useMemo } from "react";
import { AlertContext } from "./contexts/AlertContext";
import { AuthContext } from "./contexts/AuthContext";
import { useAppController } from "./controllers/useAppController";
import AuthView from "./views/AuthView";
import DashboardView from "./views/DashboardView";
import ExpenseModal from "./views/ExpenseModal";
import GroupView from "./views/GroupView";
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
    currentId: state.currentId,
    authMode: state.authMode,
    email: state.email,
    password: state.password,
    displayName: state.displayName,
    setAuthMode: actions.setAuthMode,
    setEmail: actions.setEmail,
    setPassword: actions.setPassword,
    setDisplayName: actions.setDisplayName,
    onSubmitAuth: actions.onSubmitAuth,
    onGoogleLogin: actions.onGoogleLogin,
    onLogout: actions.onLogout,
    onToggleAuthMode: actions.onToggleAuthMode
  }), [
    state.user,
    state.me,
    state.isAuthenticated,
    state.currentName,
    state.currentEmail,
    state.currentId,
    state.authMode,
    state.email,
    state.password,
    state.displayName,
    actions.setAuthMode,
    actions.setEmail,
    actions.setPassword,
    actions.setDisplayName,
    actions.onSubmitAuth,
    actions.onGoogleLogin,
    actions.onLogout,
    actions.onToggleAuthMode
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

          {!state.isAuthenticated ? (
            <AuthView />
          ) : state.activeView === "dashboard" ? (
          <DashboardView
            currentName={state.currentName}
            currentEmail={state.currentEmail}
            currentId={state.currentId}
            selectedGroupId={state.selectedGroupId}
            groups={state.groups}
            newGroupName={state.newGroupName}
            inviteEmail={state.inviteEmail}
            inviteResult={state.inviteResult}
            sentInvites={state.sentInvites}
            pendingInvites={state.pendingInvites}
            pendingInvitesLoading={state.pendingInvitesLoading}
            pendingInvitesError={state.pendingInvitesError}
            groupOwnershipById={state.groupOwnershipById}
            onOpenGroupPage={actions.onOpenGroupPage}
            onCreateGroup={actions.onCreateGroup}
            onCreateInvite={actions.onCreateInvite}
            onAcceptPendingInvite={actions.onAcceptPendingInvite}
            onDeleteInvite={actions.onDeleteInvite}
            onRefreshPendingInvites={actions.onRefreshPendingInvites}
            setSelectedGroupId={actions.setSelectedGroupId}
            setNewGroupName={actions.setNewGroupName}
            setInviteEmail={actions.setInviteEmail}
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
            totalExpense={state.totalExpense}
            effectiveMyRole={state.effectiveMyRole}
            groupError={state.groupError}
            displayMembers={state.displayMembers}
            expenses={state.expenses}
            listVariants={listVariants}
            itemVariants={itemVariants}
            onBackToDashboard={() => actions.setActiveView("dashboard")}
            onOpenExpenseModal={actions.onOpenExpenseModal}
            onDeleteExpense={actions.onDeleteExpense}
            onRefreshGroupDetail={actions.onRefreshGroupDetail}
            onDeleteGroup={actions.onDeleteGroup}
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
