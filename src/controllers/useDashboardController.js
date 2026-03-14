import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "../api";
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
  const [inviteCandidates, setInviteCandidates] = useState([]);
  const [inviteCandidatesLoading, setInviteCandidatesLoading] = useState(false);
  const [groupOwnershipById, setGroupOwnershipById] = useState({});

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function mergeSentInvites(existingInvites, incomingInvites) {
    const map = new Map();
    [...existingInvites, ...incomingInvites].forEach((invite) => {
      const key = `${invite.groupId || ""}:${normalizeEmail(invite.email)}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, invite);
        return;
      }

      const currentHasToken = Boolean(current.token);
      const inviteHasToken = Boolean(invite.token);
      if (!currentHasToken && inviteHasToken) {
        map.set(key, invite);
        return;
      }

      const currentTime = new Date(current.createdAt || 0).getTime();
      const inviteTime = new Date(invite.createdAt || 0).getTime();
      if (Number.isFinite(inviteTime) && inviteTime > currentTime) {
        map.set(key, invite);
      }
    });

    return [...map.values()].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

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
    if (!getAccessToken() || !currentEmail || currentEmail === "-") {
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

  const loadInviteCandidates = useCallback(async (groupId) => {
    if (!groupId || !getAccessToken()) {
      setInviteCandidates([]);
      setInviteCandidatesLoading(false);
      return;
    }

    setInviteCandidatesLoading(true);
    try {
      const users = await groupService.searchUsers("", groupId);
      const normalized = Array.isArray(users)
        ? users
            .filter((user) => typeof user?.email === "string" && user.email.trim().length > 0)
            .map((user) => ({
              id: user.id || user.userId || user.email,
              displayName: user.displayName || user.name || user.email,
              email: user.email
            }))
        : [];
      const existingInviteEmailSet = new Set(
        sentInvites
          .filter((invite) => invite.groupId === groupId)
          .map((invite) => normalizeEmail(invite.email))
      );
      const filtered = normalized.filter((candidate) => !existingInviteEmailSet.has(normalizeEmail(candidate.email)));
      setInviteCandidates(filtered);
      setInviteEmail((prev) => {
        if (prev && filtered.some((candidate) => candidate.email === prev)) {
          return prev;
        }
        return filtered[0]?.email || "";
      });
    } catch {
      setInviteCandidates([]);
      setInviteEmail("");
    } finally {
      setInviteCandidatesLoading(false);
    }
  }, [sentInvites]);

  const loadGroupSentInvites = useCallback(async (groupId) => {
    if (!groupId || !getAccessToken()) {
      return;
    }

    try {
      const invites = await groupService.listGroupInvites(groupId);
      const normalized = Array.isArray(invites)
        ? invites.map((invite) => ({
            id: invite.id || `${invite.groupId}:${invite.email}`,
            groupId: invite.groupId || groupId,
            groupName: "Group",
            email: invite.email,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
            token: null
          }))
        : [];
      setSentInvites((prev) => {
        const next = mergeSentInvites(prev, normalized);
        if (next.length !== prev.length) return next;
        const changed = next.some((invite, index) => {
          const current = prev[index];
          if (!current) return true;
          return invite.id !== current.id
            || invite.groupId !== current.groupId
            || invite.email !== current.email
            || invite.expiresAt !== current.expiresAt
            || invite.createdAt !== current.createdAt
            || invite.token !== current.token;
        });
        return changed ? next : prev;
      });
    } catch {
      // Keep existing local sent invites if list endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    loadInviteCandidates(selectedGroupId);
  }, [selectedGroupId, loadInviteCandidates]);

  useEffect(() => {
    loadGroupSentInvites(selectedGroupId);
  }, [selectedGroupId, loadGroupSentInvites]);

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
      const requestedEmail = inviteEmail.trim();
      const invite = await groupService.createInvite(selectedGroupId, requestedEmail);
      const groupName = groups.find((group) => group.id === selectedGroupId)?.name || "Group";
      setInviteResult(invite);
      setSentInvites((prev) => [{
        id: invite.token,
        groupId: selectedGroupId,
        groupName,
        email: requestedEmail,
        expiresAt: invite.expiresAt,
        createdAt: new Date().toISOString(),
        token: invite.token
      }, ...prev]);
      await loadGroupSentInvites(selectedGroupId);
      setInviteCandidates((prev) => {
        const next = prev.filter((candidate) => normalizeEmail(candidate.email) !== normalizeEmail(requestedEmail));
        setInviteEmail((current) => {
          if (normalizeEmail(current) !== normalizeEmail(requestedEmail)) return current;
          return next[0]?.email || "";
        });
        return next;
      });
      setSuccess("Invite created.");
    } catch (err) {
      setInviteResult(null);
      if (err?.status === 409) {
        const details = (err.message || "").toLowerCase();
        const specificReason = details.includes("already pending")
          ? "an active invite already exists for this group."
          : details.includes("already a member")
          ? "this user is already a member of the group."
          : "an active invite already exists for this group, or the user is already a member.";
        setError(`Could not create invite for ${inviteEmail.trim()}: ${specificReason}`);
        await loadGroupSentInvites(selectedGroupId);
        return;
      }
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
    setInviteCandidates([]);
    setInviteCandidatesLoading(false);
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
      await loadGroupSentInvites(invite.groupId);
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
      inviteCandidates,
      inviteCandidatesLoading,
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
