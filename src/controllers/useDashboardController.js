import { useCallback, useEffect, useState } from "react";
import { isValidGroupName } from "../models";
import { groupService } from "../services";
import { extractOwnershipFromDetail } from "../utils/groupOwnership";

export function useDashboardController({
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
  onOpenGroupPage
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [sentInvites, setSentInvites] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingInvitesLoading, setPendingInvitesLoading] = useState(false);
  const [pendingInvitesError, setPendingInvitesError] = useState("");
  const [groupOwnershipById, setGroupOwnershipById] = useState({});

  useEffect(() => {
    setGroupOwnershipById({});
  }, [currentId]);

  useEffect(() => {
    let cancelled = false;

    async function resolveOwnership() {
      if (!groups.length) {
        if (!cancelled && Object.keys(groupOwnershipById).length > 0) {
          setGroupOwnershipById({});
        }
        return;
      }

      const unresolved = groups
        .map((group) => group?.id)
        .filter((groupId) => groupId && groupOwnershipById[groupId] === undefined);

      if (!unresolved.length) return;

      const detailEntries = await Promise.all(unresolved.map(async (groupId) => {
        try {
          const detail = await groupService.details(groupId);
          return [groupId, extractOwnershipFromDetail(detail, currentId)];
        } catch {
          return [groupId, null];
        }
      }));

      if (cancelled) return;

      setGroupOwnershipById((prev) => {
        const next = { ...prev };
        detailEntries.forEach(([groupId, isOwner]) => {
          next[groupId] = isOwner;
        });

        Object.keys(next).forEach((groupId) => {
          if (!groups.some((group) => group.id === groupId)) {
            delete next[groupId];
          }
        });

        return next;
      });
    }

    resolveOwnership();
    return () => {
      cancelled = true;
    };
  }, [groups, currentId, groupOwnershipById]);

  const loadPendingInvites = useCallback(async () => {
    if (!currentEmail || currentEmail === "-") {
      setPendingInvites([]);
      setPendingInvitesError("");
      return;
    }

    setPendingInvitesLoading(true);
    setPendingInvitesError("");
    try {
      const invites = await groupService.listPendingInvitesByEmail(currentEmail);
      setPendingInvites(Array.isArray(invites) ? invites : []);
    } catch (err) {
      setPendingInvites([]);
      setPendingInvitesError(err.message || "Could not load pending invites.");
    } finally {
      setPendingInvitesLoading(false);
    }
  }, [currentEmail]);

  useEffect(() => {
    loadPendingInvites();
  }, [loadPendingInvites]);

  async function onCreateGroup(e) {
    e.preventDefault();
    if (!isValidGroupName(newGroupName)) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const created = await groupService.create(newGroupName.trim());
      const updated = [...groups, created];
      setGroups(updated);
      setGroupOwnershipById((prev) => ({ ...prev, [created.id]: true }));
      setSelectedGroupId(created.id);
      setNewGroupName("");
      setSuccess("Group created.");
    } catch (err) {
      setError(err.message || "Could not create group.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateInvite(e) {
    e.preventDefault();
    if (!selectedGroupId || !inviteEmail.trim()) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const invite = await groupService.createInvite(selectedGroupId, inviteEmail.trim());
      const groupName = groups.find((group) => group.id === selectedGroupId)?.name || "Group";
      setInviteResult(invite);
      setSentInvites((prev) => [{
        id: invite.token,
        groupId: selectedGroupId,
        groupName,
        email: invite.email,
        expiresAt: invite.expiresAt,
        createdAt: new Date().toISOString(),
        token: invite.token
      }, ...prev]);
      setSuccess("Invite created.");
    } catch (err) {
      setInviteResult(null);
      setError(err.message || "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  function onResetDashboardState() {
    setNewGroupName("");
    setInviteEmail("");
    setInviteResult(null);
    setSentInvites([]);
    setPendingInvites([]);
    setPendingInvitesLoading(false);
    setPendingInvitesError("");
    setGroupOwnershipById({});
  }

  async function onAcceptPendingInvite(inviteId) {
    if (!inviteId) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupService.acceptPendingInviteById(inviteId);
      await loadSessionData();
      await loadPendingInvites();
      setSuccess("Invite accepted. Groups refreshed.");
    } catch (err) {
      setError(err.message || "Could not accept invite.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteInvite(invite) {
    if (!invite?.groupId) return;
    if (!invite?.token) {
      setError("Invite token is unavailable for this row.");
      return;
    }

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupService.cancelInvite(invite.groupId, invite.token);
      setSentInvites((prev) => prev.filter((item) => item.id !== invite.id));
      setSuccess("Invite deleted.");
    } catch (err) {
      setError(err.message || "Could not delete invite.");
    } finally {
      setBusy(false);
    }
  }

  return {
    state: {
      newGroupName,
      inviteEmail,
      inviteResult,
      sentInvites,
      pendingInvites,
      pendingInvitesLoading,
      pendingInvitesError,
      groupOwnershipById
    },
    actions: {
      setNewGroupName,
      setInviteEmail,
      onCreateGroup,
      onCreateInvite,
      onAcceptPendingInvite,
      onDeleteInvite,
      onRefreshPendingInvites: loadPendingInvites,
      onOpenGroupPage,
      onResetDashboardState
    }
  };
}
