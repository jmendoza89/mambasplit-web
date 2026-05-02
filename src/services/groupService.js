import { friendsApi, groupsApi, invitesApi, meApi, settlementsApi, usersApi } from "../api";

export async function fetchSessionData() {
  const me = await meApi.fetchMe();
  const groups = await groupsApi.list();
  return { me, groups };
}

export const friendService = {
  list: friendsApi.list,
  detail: friendsApi.detail
};

export const groupService = {
  create: groupsApi.create,
  list: groupsApi.list,
  details: groupsApi.details,
  detailsWithMetadata: groupsApi.detailsWithMetadata,
  delete: groupsApi.delete,
  createInvite: (groupId, email, displayName) => groupsApi.createInvite(groupId, email, displayName),
  listGroupInvites: groupsApi.listGroupInvites,
  cancelInviteById: groupsApi.cancelInviteById,
  cancelInvite: groupsApi.cancelInvite,
  acceptInvite: groupsApi.acceptInvite,
  listPendingInvitesByEmail: invitesApi.listPendingByEmail,
  acceptPendingInviteById: invitesApi.acceptById,
  leaveGroup: groupsApi.leaveGroup,
  createEqualExpense: groupsApi.createEqualExpense,
  deleteExpense: groupsApi.deleteExpense,
  createSettlement: groupsApi.createSettlement,
  listGroupSettlements: groupsApi.listSettlements,
  getSettlement: settlementsApi.getById,
  listUserSettlements: settlementsApi.listByUser,
  searchUsers: usersApi.search
};
