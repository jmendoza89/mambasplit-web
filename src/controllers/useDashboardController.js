import { useCallback, useEffect, useState } from "react";
import { getAccessToken } from "../api";
import { isValidGroupName } from "../models";
import { groupService } from "../services";
import { extractOwnershipFromDetail } from "../utils/groupOwnership";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getInviteRecipientEmail(invite) {
  return String(invite?.sentToEmail ?? invite?.email ?? "").trim();
}

function inviteTimeValue(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortSentInvites(invites) {
  return [...invites].sort((a, b) => inviteTimeValue(b.createdAt) - inviteTimeValue(a.createdAt));
}

function isSameSentInvite(left, right) {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  if (left.groupId && right.groupId && left.token && right.token) {
    return left.groupId === right.groupId && left.token === right.token;
  }
  if (left.groupId && right.groupId) {
    return left.groupId === right.groupId
      && normalizeEmail(getInviteRecipientEmail(left)) === normalizeEmail(getInviteRecipientEmail(right));
  }
  return false;
}

function normalizeSentInvite(invite, {
  currentId = null,
  fallbackGroupId = "",
  fallbackGroupName = "Group",
  fallbackSentToEmail = "",
  fallbackCreatedAt = null,
  fallbackToken = null,
  fallbackSentByUserId = null
} = {}) {
  const sentByUserId = invite?.sentByUserId ?? fallbackSentByUserId ?? null;
  if (sentByUserId && currentId && currentId !== "-" && sentByUserId !== currentId) {
    return null;
  }

  const sentToEmail = getInviteRecipientEmail(invite) || fallbackSentToEmail;
  const groupId = invite?.groupId || fallbackGroupId;
  const token = invite?.token || fallbackToken || null;
  const id = invite?.id || token || `${groupId}:${normalizeEmail(sentToEmail)}`;

  return {
    id,
    groupId,
    groupName: invite?.groupName || fallbackGroupName,
    sentByUserId,
    sentToEmail,
    // Keep `email` as a compatibility alias during API rollout.
    email: sentToEmail,
    expiresAt: invite?.expiresAt || null,
    createdAt: invite?.createdAt || fallbackCreatedAt,
    token
  };
}

function replaceGroupSentInvites(existingInvites, groupId, groupInvites) {
  const others = existingInvites.filter((invite) => invite.groupId !== groupId);
  return sortSentInvites([...others, ...groupInvites]);
}

function upsertSentInvite(existingInvites, nextInvite) {
  const index = existingInvites.findIndex((invite) => isSameSentInvite(invite, nextInvite));
  if (index < 0) {
    return sortSentInvites([nextInvite, ...existingInvites]);
  }

  const next = [...existingInvites];
  next[index] = { ...next[index], ...nextInvite };
  return sortSentInvites(next);
}

function removeSentInvite(existingInvites, inviteToRemove) {
  return existingInvites.filter((invite) => !isSameSentInvite(invite, inviteToRemove));
}

function areSentInviteListsEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((invite, index) => {
    const current = right[index];
    if (!current) return false;
    return invite.id === current.id
      && invite.groupId === current.groupId
      && invite.groupName === current.groupName
      && invite.sentByUserId === current.sentByUserId
      && invite.sentToEmail === current.sentToEmail
      && invite.email === current.email
      && invite.expiresAt === current.expiresAt
      && invite.createdAt === current.createdAt
      && invite.token === current.token;
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function getDeleteInviteValidationError(invite, actorUserId) {
  if (!invite?.groupId) return "Invite group is unavailable for this row.";
  if (!invite?.sentByUserId) return "Invite sender is unavailable for this row.";
  if (!actorUserId || actorUserId === "-" || invite.sentByUserId !== actorUserId) {
    return "Only the member who sent this invite can delete it.";
  }
  if (!invite?.id && !invite?.token) return "Invite identifier is unavailable for this row.";
  return "";
}

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

  useEffect(() => {
    setGroupOwnershipById({});
    setSentInvites([]);
    setInviteResult(null);
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
      const normalized = Array.isArray(invites)
        ? invites.map((invite) => {
            const sentToEmail = getInviteRecipientEmail(invite);
            return {
              ...invite,
              sentToEmail,
              // Keep `email` aligned for legacy bindings.
              email: sentToEmail
            };
          })
        : [];
      setPendingInvites(normalized);
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
          .map((invite) => normalizeEmail(getInviteRecipientEmail(invite)))
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

  useEffect(() => {
    loadInviteCandidates(selectedGroupId);
  }, [selectedGroupId, loadInviteCandidates]);

  useEffect(() => {
    if (!selectedGroupId || !getAccessToken()) {
      return;
    }

    let cancelled = false;
    async function loadGroupSentInvites() {
      try {
        const invites = await groupService.listGroupInvites(selectedGroupId);
        if (cancelled) return;
        const normalized = Array.isArray(invites)
          ? invites
              .map((invite) => normalizeSentInvite(invite, {
                currentId,
                fallbackGroupId: selectedGroupId,
                fallbackGroupName: invite?.groupName || "Group"
              }))
              .filter(Boolean)
          : [];
        setSentInvites((prev) => {
          const next = replaceGroupSentInvites(prev, selectedGroupId, normalized);
          return areSentInviteListsEqual(prev, next) ? prev : next;
        });
      } catch {
        // Keep existing local sent invites if list endpoint is unavailable.
      }
    }

    loadGroupSentInvites();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, currentId]);

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
    const requestedEmail = inviteEmail.trim();

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const invite = await groupService.createInvite(selectedGroupId, requestedEmail);
      const groupName = groups.find((group) => group.id === selectedGroupId)?.name || "Group";
      const normalizedInvite = normalizeSentInvite(invite, {
        currentId,
        fallbackGroupId: selectedGroupId,
        fallbackGroupName: groupName,
        fallbackSentToEmail: requestedEmail,
        fallbackCreatedAt: new Date().toISOString(),
        fallbackToken: invite?.token,
        fallbackSentByUserId: currentId
      });
      if (!normalizedInvite) {
        throw new Error("Could not map created invite.");
      }
      setInviteResult(normalizedInvite);
      setSentInvites((prev) => upsertSentInvite(prev, normalizedInvite));
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
        setError(`Could not create invite for ${requestedEmail}: ${specificReason}`);
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
    const validationError = getDeleteInviteValidationError(invite, currentId);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSuccess("");
    setBusy(true);
    let previousInvites = null;
    setSentInvites((prev) => {
      previousInvites = prev;
      return removeSentInvite(prev, invite);
    });
    try {
      if (isUuid(invite.id)) {
        await groupService.cancelInviteById(invite.groupId, invite.id);
      } else {
        await groupService.cancelInvite(invite.groupId, invite.token);
      }
      setSuccess("Invite deleted.");
    } catch (err) {
      if (previousInvites) {
        setSentInvites(previousInvites);
      }
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
