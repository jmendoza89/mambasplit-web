import { useState } from "react";
import { isValidGroupName } from "../models";
import { groupService } from "../services";

export function useDashboardController({
  groups,
  selectedGroupId,
  setGroups,
  setSelectedGroupId,
  setError,
  setSuccess,
  setBusy,
  loadSessionData,
  onOpenGroupPage
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [acceptToken, setAcceptToken] = useState("");
  const [inviteResult, setInviteResult] = useState(null);

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
      setInviteResult(invite);
      setSuccess("Invite created.");
    } catch (err) {
      setInviteResult(null);
      setError(err.message || "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function onAcceptInvite(e) {
    e.preventDefault();
    if (!acceptToken.trim()) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupService.acceptInvite(acceptToken.trim());
      await loadSessionData();
      setAcceptToken("");
      setSuccess("Invite accepted. Groups refreshed.");
    } catch (err) {
      setError(err.message || "Could not accept invite.");
    } finally {
      setBusy(false);
    }
  }

  function onResetDashboardState() {
    setNewGroupName("");
    setInviteEmail("");
    setAcceptToken("");
    setInviteResult(null);
  }

  return {
    state: {
      newGroupName,
      inviteEmail,
      acceptToken,
      inviteResult
    },
    actions: {
      setNewGroupName,
      setInviteEmail,
      setAcceptToken,
      onCreateGroup,
      onCreateInvite,
      onAcceptInvite,
      onOpenGroupPage,
      onResetDashboardState
    }
  };
}
