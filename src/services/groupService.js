import { groupsApi, invitesApi, meApi, settlementsApi, usersApi } from "../api";

export async function fetchSessionData() {
  const me = await meApi.fetchMe();
  const groups = await groupsApi.list();
  return { me, groups };
}

export const groupService = {
  create: groupsApi.create,
  list: groupsApi.list,
  details: groupsApi.details,
  delete: groupsApi.delete,
  createInvite: groupsApi.createInvite,
  listGroupInvites: groupsApi.listGroupInvites,
  cancelInviteById: groupsApi.cancelInviteById,
  cancelInvite: groupsApi.cancelInvite,
  acceptInvite: groupsApi.acceptInvite,
  listPendingInvitesByEmail: invitesApi.listPendingByEmail,
  acceptPendingInviteById: invitesApi.acceptById,
  createEqualExpense: groupsApi.createEqualExpense,
  deleteExpense: groupsApi.deleteExpense,
  createSettlement: groupsApi.createSettlement,
  listGroupSettlements: groupsApi.listSettlements,
  getSettlement: settlementsApi.getById,
  listUserSettlements: settlementsApi.listByUser,
  searchUsers: usersApi.search
};
