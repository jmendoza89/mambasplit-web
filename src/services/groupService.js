import { groupsApi, meApi } from "../api";

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
  acceptInvite: groupsApi.acceptInvite,
  createEqualExpense: groupsApi.createEqualExpense,
  deleteExpense: groupsApi.deleteExpense
};
