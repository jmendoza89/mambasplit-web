import { friendsApi } from "../api";

export const friendService = {
  list: () => friendsApi.list(),
  detail: (friendConnectionId) => friendsApi.detail(friendConnectionId)
};
