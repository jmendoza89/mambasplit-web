import { motion } from "motion/react";
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
    <>
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
          <AuthView
            authMode={state.authMode}
            displayName={state.displayName}
            email={state.email}
            password={state.password}
            busy={state.busy}
            onSubmitAuth={actions.onSubmitAuth}
            onToggleAuthMode={actions.onToggleAuthMode}
            setDisplayName={actions.setDisplayName}
            setEmail={actions.setEmail}
            setPassword={actions.setPassword}
          />
        ) : state.activeView === "dashboard" ? (
          <DashboardView
            currentName={state.currentName}
            currentEmail={state.currentEmail}
            currentId={state.currentId}
            selectedGroupId={state.selectedGroupId}
            groups={state.groups}
            newGroupName={state.newGroupName}
            inviteEmail={state.inviteEmail}
            acceptToken={state.acceptToken}
            inviteResult={state.inviteResult}
            busy={state.busy}
            onOpenGroupPage={actions.onOpenGroupPage}
            onLogout={actions.onLogout}
            onCreateGroup={actions.onCreateGroup}
            onCreateInvite={actions.onCreateInvite}
            onAcceptInvite={actions.onAcceptInvite}
            setSelectedGroupId={actions.setSelectedGroupId}
            setNewGroupName={actions.setNewGroupName}
            setInviteEmail={actions.setInviteEmail}
            setAcceptToken={actions.setAcceptToken}
          />
        ) : (
          <GroupView
            selectedGroupId={state.selectedGroupId}
            busy={state.busy}
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
            onRefreshGroupDetail={actions.onRefreshGroupDetail}
            onDeleteGroup={actions.onDeleteGroup}
            onLogout={actions.onLogout}
          />
        )}
      </motion.main>

      <ExpenseModal
        isOpen={state.isExpenseModalOpen}
        expenseDescription={state.expenseDescription}
        expenseAmount={state.expenseAmount}
        expenseSavedStatus={state.expenseSavedStatus}
        busy={state.busy}
        groupLoading={state.groupLoading}
        selectedGroupId={state.selectedGroupId}
        expenseDescriptionRef={refs.expenseDescriptionRef}
        expenseAmountRef={refs.expenseAmountRef}
        onClose={actions.onCloseExpenseModal}
        onCreateExpense={actions.onCreateExpense}
        onExpenseDescriptionKeyDown={actions.onExpenseDescriptionKeyDown}
        setExpenseDescription={actions.setExpenseDescription}
        setExpenseAmount={actions.setExpenseAmount}
      />
    </>
  );
}
