import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMockPasswordResetStore,
  consumeMockPasswordResetToken,
  createMockPasswordResetRequest,
  getLatestMockPasswordResetEmail,
  getLatestMockPasswordResetResult,
  verifyMockPasswordResetToken
} from "../mockPasswordResetService";

describe("mockPasswordResetService", () => {
  beforeEach(() => {
    localStorage.clear();
    clearMockPasswordResetStore();
  });

  it("creates and verifies a reset token", () => {
    const now = Date.UTC(2026, 2, 17, 9, 0, 0);
    const email = createMockPasswordResetRequest("User@Example.com", now);
    expect(email.toEmail).toBe("user@example.com");
    expect(email.link).toContain("resetToken=");

    const verified = verifyMockPasswordResetToken(email.token, now + 1000);
    expect(verified.status).toBe("valid");
    expect(verified.email).toBe("user@example.com");

    const latest = getLatestMockPasswordResetEmail();
    expect(latest?.token).toBe(email.token);
  });

  it("marks a token as used after reset", () => {
    const now = Date.UTC(2026, 2, 17, 9, 0, 0);
    const request = createMockPasswordResetRequest("user@example.com", now);
    const consumed = consumeMockPasswordResetToken(request.token, "new-password-123", now + 5000);
    expect(consumed.status).toBe("reset");

    const verified = verifyMockPasswordResetToken(request.token, now + 6000);
    expect(verified.status).toBe("used");

    const result = getLatestMockPasswordResetResult();
    expect(result?.password).toBe("new-password-123");
    expect(result?.email).toBe("user@example.com");
  });

  it("expires token after ttl", () => {
    const now = Date.UTC(2026, 2, 17, 9, 0, 0);
    const request = createMockPasswordResetRequest("user@example.com", now);
    const verified = verifyMockPasswordResetToken(request.token, now + (1000 * 60 * 30) + 1);
    expect(verified.status).toBe("expired");
  });
});
