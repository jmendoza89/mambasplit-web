import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildExpenseParticipants,
  findSelectedGroup,
  normalizeExpenses,
  normalizeMembers,
  normalizeSettlementSuggestions,
  normalizeSettlements,
  selectDisplayedGroup
} from "../models";
import { groupService } from "../services";
import { isUuid, toNumberAmount } from "../utils/formatters";
import { validateExpenseAmount, validateExpenseDescription, validateFields } from "../utils/validation";

function hasConcreteSettlementId(value) {
  return typeof value === "string"
    && value.trim().length > 0
    && value !== "00000000-0000-0000-0000-000000000000";
}

export function useGroupController({
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
}) {
  const [groupLoading, setGroupLoading] = useState(false);
  const [localGroupError, setLocalGroupError] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expensePayerUserId, setExpensePayerUserId] = useState("");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseSavedStatus, setExpenseSavedStatus] = useState(null);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [recentSettlementId, setRecentSettlementId] = useState(null);
  const expenseDescriptionRef = useRef(null);
  const expenseAmountRef = useRef(null);

  const selectedGroup = useMemo(
    () => findSelectedGroup(groups, selectedGroupId),
    [groups, selectedGroupId]
  );

  const displayedGroup = useMemo(
    () => selectDisplayedGroup(selectedGroupId, selectedGroup, groupDetail),
    [groupDetail, selectedGroup, selectedGroupId]
  );

  const members = useMemo(() => normalizeMembers(displayedGroup), [displayedGroup]);
  const expenses = useMemo(() => normalizeExpenses(displayedGroup, members), [displayedGroup, members]);
  const settlements = useMemo(() => normalizeSettlements(displayedGroup), [displayedGroup]);
  const settlementSuggestions = useMemo(
    () => normalizeSettlementSuggestions(displayedGroup),
    [displayedGroup]
  );
  const detailsSummary = displayedGroup?.summary || null;
  const detailsMe = displayedGroup?.me || null;
  const detailsGroupInfo = displayedGroup?.group || null;
  const isGroupOwner = useMemo(() => {
    if (!selectedGroupId) return false;
    if (detailsMe?.role === "OWNER") return true;
    return Boolean(detailsGroupInfo?.createdBy && detailsGroupInfo.createdBy === currentId);
  }, [selectedGroupId, detailsMe, detailsGroupInfo, currentId]);
  const effectiveMemberCount = members.length || (selectedGroupId ? 1 : 0);
  const effectiveMyRole = detailsMe?.role || (selectedGroupId ? "MEMBER" : "-");
  const displayMembers = useMemo(() => {
    if (members.length) return members;
    if (!selectedGroupId) return [];
    return [{
      id: currentId,
      name: currentName,
      email: currentEmail,
      role: effectiveMyRole,
      joinedAt: null,
      netBalanceCents: null
    }];
  }, [members, selectedGroupId, currentId, currentName, currentEmail, effectiveMyRole]);
  const totalExpense = useMemo(() => {
    if (typeof detailsSummary?.totalExpenseAmountCents === "number") {
      return detailsSummary.totalExpenseAmountCents / 100;
    }
    return expenses.reduce((sum, expense) => sum + toNumberAmount(expense.amount), 0);
  }, [detailsSummary, expenses]);
  const expenseCount = typeof detailsSummary?.expenseCount === "number" ? detailsSummary.expenseCount : expenses.length;
  const settlementCount = typeof detailsSummary?.settlementCount === "number"
    ? detailsSummary.settlementCount
    : settlements.length;
  const totalSettlementAmount = typeof detailsSummary?.totalSettlementAmountCents === "number"
    ? detailsSummary.totalSettlementAmountCents / 100
    : settlements.reduce((sum, settlement) => sum + ((settlement.amountCents || 0) / 100), 0);

  const loadGroupDetail = useCallback(async (groupId, options = {}) => {
    if (!groupId) return;
    const force = options.force === true;
    if (!force && groupDetailStatusById[groupId] === 403) return;
    setGroupLoading(true);
    setLocalGroupError("");
    setGroupError("");

    try {
      const detail = await groupService.details(groupId);
      setGroupDetail(detail);

      // Sync the user's personal balance from detail back into the groups list
      // so the dashboard card reflects the same balance shown in the group view.
      const syncedBalance = detail?.me?.netBalanceCents ?? detail?.summary?.netBalanceCents;
      if (typeof syncedBalance === "number") {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId ? { ...g, netBalanceCents: syncedBalance } : g
          )
        );
      }

      setGroupDetailStatusById((prev) => {
        if (!(groupId in prev)) return prev;
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    } catch (err) {
      setGroupDetail(null);
      const status = err?.status ? ` (HTTP ${err.status})` : "";
      const message = err?.status === 403
        ? "Group details endpoint is forbidden by the API for this user/group."
        : (err.message || "Group details are currently unavailable.");
      const finalMessage = `${message}${status}`;
      setLocalGroupError(finalMessage);
      setGroupError(finalMessage);
      setGroupDetailStatusById((prev) => ({ ...prev, [groupId]: err?.status || -1 }));
    } finally {
      setGroupLoading(false);
    }
  }, [groupDetailStatusById, setGroupError, setGroupDetail, setGroupDetailStatusById, setGroups]);

  useEffect(() => {
    if (activeView !== "group" || !selectedGroupId) return;
    if (groupDetail && (groupDetail.group?.id === selectedGroupId || groupDetail.id === selectedGroupId)) return;
    loadGroupDetail(selectedGroupId);
  }, [activeView, selectedGroupId, groupDetail, loadGroupDetail, groups]);

  useEffect(() => {
    if (!isExpenseModalOpen) return;
    const focusTimer = window.setTimeout(() => {
      if (expenseDescriptionRef.current) {
        expenseDescriptionRef.current.focus();
      }
    }, 0);

    function onEscape(event) {
      if (event.key === "Escape") {
        setIsExpenseModalOpen(false);
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onEscape);
    };
  }, [isExpenseModalOpen]);

  async function onOpenGroupPage(groupId) {
    if (!groupId) return;
    setSelectedGroupId(groupId);
    setActiveView("group");
    await loadGroupDetail(groupId);
  }

  async function onCreateExpense(e) {
    if (e) e.preventDefault();
    
    // Validate all inputs
    const validationError = validateFields([
      validateExpenseDescription(expenseDescription),
      validateExpenseAmount(expenseAmount)
    ]);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!selectedGroupId) {
      setError("No group selected.");
      return;
    }

    if (!isUuid(expensePayerUserId)) {
      setError("Could not determine current user id for payer.");
      return;
    }

    const numericAmount = Number(expenseAmount);

    const participants = buildExpenseParticipants(members, expensePayerUserId);
    if (!participants.length) {
      setError("No valid participant ids found for this group.");
      return;
    }

    setError("");
    setSuccess("");
    setExpenseSavedStatus(null);
    setBusy(true);
    try {
      await groupService.createEqualExpense(selectedGroupId, {
        description: expenseDescription.trim(),
        payerUserId: expensePayerUserId,
        amountCents: Math.round(numericAmount * 100),
        participants
      });
      const savedDescription = expenseDescription.trim();
      const savedAmount = numericAmount;
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseSavedStatus({
        description: savedDescription,
        amount: savedAmount,
        savedAt: new Date().toISOString()
      });
      await loadGroupDetail(selectedGroupId);
      if (expenseDescriptionRef.current) {
        expenseDescriptionRef.current.focus();
      }
    } catch (err) {
      setError(err.message || "Could not add expense.");
    } finally {
      setBusy(false);
    }
  }

  function onExpenseDescriptionKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (expenseAmount.trim()) {
      onCreateExpense();
      return;
    }

    if (expenseAmountRef.current) {
      expenseAmountRef.current.focus();
    }
  }

  function onOpenExpenseModal() {
    setExpenseSavedStatus(null);
    setExpenseDescription("");
    setExpenseAmount("");
    setExpensePayerUserId(currentId);
    setIsExpenseModalOpen(true);
  }

  function onCloseExpenseModal() {
    setIsExpenseModalOpen(false);
  }

  async function onDeleteGroup() {
    if (!selectedGroupId) return;
    if (!isGroupOwner) {
      setError("Only the group owner can delete this group.");
      return;
    }

    const confirmed = window.confirm("Delete this group permanently? This cannot be undone.");
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupService.delete(selectedGroupId);
      const deletedId = selectedGroupId;
      const remaining = groups.filter((group) => group.id !== deletedId);
      setGroups(remaining);
      setSelectedGroupId((remaining[0] && remaining[0].id) || "");
      setGroupDetail(null);
      setGroupError("");
      setLocalGroupError("");
      setGroupDetailStatusById((prev) => {
        if (!(deletedId in prev)) return prev;
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });
      setActiveView("dashboard");
      setSuccess("Group deleted.");
      return remaining;
    } catch (err) {
      setError(err.message || "Could not delete group.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteExpense(expenseId) {
    if (!selectedGroupId || !expenseId) return;
    const expense = expenses.find((item) => item.id === expenseId);
    if (expense?.settlementId) {
      setError("Settled expenses cannot be deleted.");
      return;
    }
    if (expense?.payerUserId && expense.payerUserId !== currentId) {
      setError("Only the expense owner can delete this expense.");
      return;
    }

    const confirmed = window.confirm("Delete this expense permanently? This cannot be undone.");
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupService.deleteExpense(selectedGroupId, expenseId);
      await loadGroupDetail(selectedGroupId, { force: true });
      setSuccess("Expense deleted.");
    } catch (err) {
      if (err?.status === 409) {
        const latestDetail = await groupService.details(selectedGroupId);
        setGroupDetail(latestDetail);
        const latestExpense = (latestDetail?.expenses || []).find((item) => item?.id === expenseId);
        if (!latestExpense) {
          setSuccess("Expense deleted.");
        } else if (hasConcreteSettlementId(latestExpense?.settlementId)) {
          setError("Expense cannot be deleted because it is already settled.");
        } else {
          setError(err.message || "Expense cannot be deleted due to a conflict.");
        }
        return;
      }
      setError(err.message || "Could not delete expense.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateSettlement(payload) {
    if (!selectedGroupId) {
      setError("No group selected.");
      return null;
    }

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const result = await groupService.createSettlement(selectedGroupId, payload);
      const normalizedResult = result || { settlementId: null };
      setRecentSettlementId(result?.settlementId || result?.settlement?.id || null);
      await loadGroupDetail(selectedGroupId, { force: true });
      setSuccess("Settlement saved.");
      setIsSettleUpModalOpen(false);
      return normalizedResult;
    } catch (err) {
      const baseMessage = err.message || "Could not save settlement.";
      const errorMessage = err?.status ? `${baseMessage} (HTTP ${err.status})` : baseMessage;
      setError(errorMessage);
      return { errorMessage };
    } finally {
      setBusy(false);
    }
  }

  function onOpenSettleUpModal() {
    setIsSettleUpModalOpen(true);
  }

  function onCloseSettleUpModal() {
    setIsSettleUpModalOpen(false);
  }

  function onResetGroupState() {
    setExpenseDescription("");
    setExpenseAmount("");
    setExpensePayerUserId("");
    setIsExpenseModalOpen(false);
    setExpenseSavedStatus(null);
    setLocalGroupError("");
  }

  return {
    state: {
      groupLoading,
      groupError: localGroupError,
      isGroupOwner,
      displayedGroup,
      detailsGroupInfo,
      detailsMe,
      effectiveMemberCount,
      effectiveMyRole,
      displayMembers,
      expenses,
      settlements,
      settlementSuggestions,
      totalExpense,
      expenseCount,
      settlementCount,
      totalSettlementAmount,
      isExpenseModalOpen,
      isSettleUpModalOpen,
      recentSettlementId,
      expenseDescription,
      expenseAmount,
      expensePayerUserId,
      expenseSavedStatus
    },
    refs: {
      expenseDescriptionRef,
      expenseAmountRef
    },
    actions: {
      onOpenGroupPage,
      onCreateExpense,
      onExpenseDescriptionKeyDown,
      onOpenExpenseModal,
      onCloseExpenseModal,
      onOpenSettleUpModal,
      onCloseSettleUpModal,
      onCreateSettlement,
      onDeleteExpense,
      onDeleteGroup,
      onRefreshGroupDetail: () => loadGroupDetail(selectedGroupId, { force: true }),
      setExpenseDescription,
      setExpenseAmount,
      setExpensePayerUserId,
      onResetGroupState
    }
  };
}
