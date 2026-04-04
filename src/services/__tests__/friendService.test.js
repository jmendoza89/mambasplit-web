import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { friendService } from "../friendService";

vi.mock("../../api", () => ({
  friendsApi: {
    list: vi.fn(),
    detail: vi.fn()
  }
}));

import { friendsApi } from "../../api";

const mockFriendList = [
  {
    id: "fc-1",
    displayName: "Doug Rosenberger",
    email: "doug@example.com",
    status: "Connected",
    friendUserId: "user-doug",
    netBalanceCents: 500,
    netBalanceLabel: "Doug owes you $5.00",
    sharedGroupCount: 1,
    hasActiveSharedBalances: true,
    lastUsedAtUtc: "2026-04-01T00:00:00Z"
  },
  {
    id: "fc-2",
    displayName: "Mina Torres",
    email: "mina@example.com",
    status: "Pending",
    friendUserId: null,
    netBalanceCents: 0,
    netBalanceLabel: "All settled",
    sharedGroupCount: 0,
    hasActiveSharedBalances: false,
    lastUsedAtUtc: null
  }
];

const mockFriendDetail = {
  id: "fc-1",
  displayName: "Doug Rosenberger",
  email: "doug@example.com",
  status: "Connected",
  friendUserId: "user-doug",
  netBalanceCents: 500,
  netBalanceLabel: "Doug owes you $5.00",
  summary: "Doug owes you $5.00",
  sharedGroups: [
    {
      groupId: "group-1",
      groupName: "Love Nest",
      balanceCents: 500,
      balanceLabel: "Doug owes you $5.00",
      hasUnsettledExpenses: true
    }
  ]
};

describe("friendService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("list()", () => {
    it("returns the friend list on success", async () => {
      friendsApi.list.mockResolvedValueOnce(mockFriendList);
      const result = await friendService.list();
      expect(friendsApi.list).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockFriendList);
    });

    it("returns an empty array when API returns empty", async () => {
      friendsApi.list.mockResolvedValueOnce([]);
      const result = await friendService.list();
      expect(result).toEqual([]);
    });

    it("propagates network errors", async () => {
      friendsApi.list.mockRejectedValueOnce(new Error("Network error"));
      await expect(friendService.list()).rejects.toThrow("Network error");
    });

    it("propagates 401 errors", async () => {
      const err = Object.assign(new Error("Unauthorized"), { status: 401 });
      friendsApi.list.mockRejectedValueOnce(err);
      await expect(friendService.list()).rejects.toMatchObject({ status: 401 });
    });

    it("propagates 404 errors", async () => {
      const err = Object.assign(new Error("Not Found"), { status: 404 });
      friendsApi.list.mockRejectedValueOnce(err);
      await expect(friendService.list()).rejects.toMatchObject({ status: 404 });
    });

    it("propagates 500 errors", async () => {
      const err = Object.assign(new Error("Internal Server Error"), { status: 500 });
      friendsApi.list.mockRejectedValueOnce(err);
      await expect(friendService.list()).rejects.toMatchObject({ status: 500 });
    });
  });

  describe("detail()", () => {
    it("returns friend detail on success", async () => {
      friendsApi.detail.mockResolvedValueOnce(mockFriendDetail);
      const result = await friendService.detail("fc-1");
      expect(friendsApi.detail).toHaveBeenCalledWith("fc-1");
      expect(result).toEqual(mockFriendDetail);
    });

    it("propagates 404 when friend connection not found", async () => {
      const err = Object.assign(new Error("Not Found"), { status: 404 });
      friendsApi.detail.mockRejectedValueOnce(err);
      await expect(friendService.detail("nonexistent")).rejects.toMatchObject({ status: 404 });
    });

    it("propagates 401 errors", async () => {
      const err = Object.assign(new Error("Unauthorized"), { status: 401 });
      friendsApi.detail.mockRejectedValueOnce(err);
      await expect(friendService.detail("fc-1")).rejects.toMatchObject({ status: 401 });
    });

    it("propagates network errors", async () => {
      friendsApi.detail.mockRejectedValueOnce(new Error("Network error"));
      await expect(friendService.detail("fc-1")).rejects.toThrow("Network error");
    });
  });
});
