import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountView from "../AccountView";

afterEach(() => {
  cleanup();
});

describe("AccountView", () => {
  it("renders account details as read only until edit is clicked", () => {
    const onSaveAccountProfile = vi.fn();

    render(
      <AccountView
        currentName="Julio Mendoza"
        currentEmail="jmendoza89@gmail.com"
        currentPhone="3366939833"
        currentAvatarUrl=""
        hasGoogleLogin={false}
        busy={false}
        onBackToDashboard={vi.fn()}
        onSaveAccountProfile={onSaveAccountProfile}
        onChangePassword={vi.fn()}
      />
    );

    const nameRow = screen.getByText("Your name").closest(".account-info-row");
    expect(within(nameRow).getByText("Julio Mendoza")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Julio Mendoza")).not.toBeInTheDocument();
    fireEvent.click(within(nameRow).getByRole("button", { name: "Edit" }));

    const nameInput = screen.getByDisplayValue("Julio Mendoza");
    fireEvent.change(nameInput, { target: { value: "Julio M." } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onSaveAccountProfile).toHaveBeenCalledWith(expect.objectContaining({
      displayName: "Julio M."
    }));
  });

  it("shows a Google-linked password message and skips current password", () => {
    render(
      <AccountView
        currentName="Google User"
        currentEmail="google@example.com"
        currentPhone=""
        currentAvatarUrl=""
        hasGoogleLogin
        busy={false}
        onBackToDashboard={vi.fn()}
        onSaveAccountProfile={vi.fn()}
        onChangePassword={vi.fn()}
      />
    );

    expect(
      screen.getByText("Google sign-in is linked. You can add a password too if you want email/password login.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set Password" }));

    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("allows a Google-linked user to submit a new password even when the page is busy", () => {
    render(
      <AccountView
        currentName="Google User"
        currentEmail="google@example.com"
        currentPhone=""
        currentAvatarUrl=""
        hasGoogleLogin
        busy
        onBackToDashboard={vi.fn()}
        onSaveAccountProfile={vi.fn()}
        onChangePassword={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Set Password" }));
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "password123" } });

    expect(screen.getByRole("button", { name: "Save Password" })).toBeEnabled();
  });
});
