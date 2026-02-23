import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildExpenseParticipants,
  findSelectedGroup,
  isValidExpenseAmount,
  normalizeExpenses,
  normalizeMembers,
  selectDisplayedGroup
} from "../models";
import { groupService } from "../services";
import { isUuid, toNumberAmount } from "../utils/formatters";

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
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseSavedStatus, setExpenseSavedStatus] = useState(null);
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
  }, [groupDetailStatusById, setGroupError, setGroupDetail, setGroupDetailStatusById]);

  useEffect(() => {
    if (activeView !== "group" || !selectedGroupId) return;
    if (groupDetail && (groupDetail.group?.id === selectedGroupId || groupDetail.id === selectedGroupId)) return;
    loadGroupDetail(selectedGroupId);
  }, [activeView, selectedGroupId, groupDetail, loadGroupDetail]);

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
    if (!selectedGroupId || !expenseDescription.trim() || !expenseAmount.trim()) return;
    if (!isUuid(currentId)) {
      setError("Could not determine current user id for payer.");
      return;
    }

    if (!isValidExpenseAmount(expenseAmount)) {
      setError("Amount must be greater than zero.");
      return;
    }
    const numericAmount = Number(expenseAmount);

    const participants = buildExpenseParticipants(members, currentId);
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
        payerUserId: currentId,
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

  function onResetGroupState() {
    setExpenseDescription("");
    setExpenseAmount("");
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
      totalExpense,
      expenseCount,
      isExpenseModalOpen,
      expenseDescription,
      expenseAmount,
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
      onDeleteGroup,
      onRefreshGroupDetail: () => loadGroupDetail(selectedGroupId, { force: true }),
      setExpenseDescription,
      setExpenseAmount,
      onResetGroupState
    }
  };
}
