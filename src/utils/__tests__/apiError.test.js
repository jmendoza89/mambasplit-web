import { describe, expect, it } from "vitest";
import { createErrorFromResponse } from "../apiError";

describe("createErrorFromResponse", () => {
  it("expands generic numeric 409 errors into a descriptive message", async () => {
    const response = new Response(JSON.stringify({ message: "Request failed (409)." }), {
      status: 409,
      headers: { "Content-Type": "application/json" }
    });

    const error = await createErrorFromResponse(response, "Request failed");
    expect(error.message).toContain("Conflict detected.");
    expect(error.message).toContain("HTTP 409");
  });
});
