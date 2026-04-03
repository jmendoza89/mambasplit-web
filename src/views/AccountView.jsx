import { useEffect, useMemo, useState } from "react";
import { initials } from "../utils/formatters";

const EDITABLE_FIELDS = ["displayName", "email", "phone", "avatar"];

function createProfileState({ currentName, currentEmail, currentPhone, currentAvatarUrl }) {
  return {
    displayName: currentName || "",
    email: currentEmail === "-" ? "" : currentEmail || "",
    phone: currentPhone || "",
    avatarUrl: currentAvatarUrl || ""
  };
}

function emptyPasswordForm() {
  return {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  };
}

export default function AccountView({
  currentName,
  currentEmail,
  currentPhone,
  currentAvatarUrl,
  hasGoogleLogin,
  busy,
  onBackToDashboard,
  onSaveAccountProfile,
  onChangePassword
}) {
  const baseProfile = useMemo(
    () => createProfileState({ currentName, currentEmail, currentPhone, currentAvatarUrl }),
    [currentName, currentEmail, currentPhone, currentAvatarUrl]
  );
  const [form, setForm] = useState(baseProfile);
  const [editingField, setEditingField] = useState("");
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    setForm(baseProfile);
    setEditingField("");
    setIsEditingPassword(false);
    setPasswordForm(emptyPasswordForm());
    setIsSubmittingPassword(false);
  }, [baseProfile]);

  const hasChanges = useMemo(() => (
    form.displayName !== baseProfile.displayName
    || form.email !== baseProfile.email
    || form.phone !== baseProfile.phone
    || form.avatarUrl !== baseProfile.avatarUrl
  ), [form, baseProfile]);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        avatarUrl: typeof reader.result === "string" ? reader.result : prev.avatarUrl
      }));
    };
    reader.readAsDataURL(file);
  }

  function startEditing(fieldName) {
    if (!EDITABLE_FIELDS.includes(fieldName)) return;
    setEditingField(fieldName);
  }

  function cancelEditing() {
    setForm(baseProfile);
    setEditingField("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSaveAccountProfile(form);
    setEditingField("");
  }

  function handlePasswordFieldChange(event) {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  }

  function startPasswordEditing() {
    setIsEditingPassword(true);
    setPasswordForm(emptyPasswordForm());
    setIsSubmittingPassword(false);
  }

  function cancelPasswordEditing() {
    setIsEditingPassword(false);
    setPasswordForm(emptyPasswordForm());
    setIsSubmittingPassword(false);
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }

    try {
      setIsSubmittingPassword(true);
      await onChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      cancelPasswordEditing();
    } catch {
      // Global alert state already shows the error.
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  function renderEditableRow({ field, label, value, type = "text", placeholder = "" }) {
    const isEditing = editingField === field;

    return (
      <div className="account-info-row" key={field}>
        <div className="account-info-head">
          <label htmlFor={`account-${field}`}>{label}</label>
          {!isEditing ? (
            <button type="button" className="account-inline-edit" onClick={() => startEditing(field)}>
              Edit
            </button>
          ) : null}
        </div>

        {isEditing ? (
          <input
            id={`account-${field}`}
            name={field}
            type={type}
            value={value}
            onChange={handleFieldChange}
            placeholder={placeholder}
            required={field !== "phone"}
            autoFocus
          />
        ) : (
          <p className="account-readonly-value">{value || "Not added yet"}</p>
        )}
      </div>
    );
  }

  const isEditingAvatar = editingField === "avatar";
  const summaryName = form.displayName || currentName || "Your profile";
  const summaryEmail = form.email || currentEmail || "Add an email address";

  return (
    <section className="dash-wrap">
      <article className="card panel account-page">
        <div className="account-page-header">
          <div className="account-page-title-block">
            <p className="account-eyebrow">Account settings</p>
            <h2>Your account</h2>
            <p className="account-page-subtitle">Manage your profile, sign-in details, and the way your account shows up across MambaSplit.</p>
          </div>
          <div className="account-page-top">
            <button className="btn-ghost" type="button" onClick={onBackToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </div>

        <form className="account-layout" onSubmit={handleSubmit}>
          <section className="account-avatar-panel">
            {form.avatarUrl ? (
              <img className="account-avatar-image" src={form.avatarUrl} alt={`${form.displayName || "User"} avatar`} />
            ) : (
              <div className="account-avatar-fallback" aria-hidden="true">{initials(form.displayName || currentName)}</div>
            )}

            <div className="account-info-head">
              <label className="account-file-label" htmlFor="accountAvatar">
                Change your avatar
              </label>
              {!isEditingAvatar ? (
                <button type="button" className="account-inline-edit" onClick={() => startEditing("avatar")}>
                  Edit
                </button>
              ) : null}
            </div>

            {isEditingAvatar ? (
              <input id="accountAvatar" type="file" accept="image/*" onChange={handleAvatarChange} />
            ) : (
              <p className="account-avatar-note">Click edit to choose a new profile photo.</p>
            )}
          </section>

          <section className="account-fields">
            <div className="account-summary-card">
              <p className="account-summary-label">Profile overview</p>
              <h3>{summaryName}</h3>
              <p>{summaryEmail}</p>
            </div>

            {renderEditableRow({
              field: "displayName",
              label: "Your name",
              value: form.displayName
            })}

            {renderEditableRow({
              field: "email",
              label: "Your email address",
              value: form.email,
              type: "email"
            })}

            {renderEditableRow({
              field: "phone",
              label: "Your phone number",
              value: form.phone,
              type: "tel",
              placeholder: "Add a phone number"
            })}

            {editingField ? (
              <div className="actions">
                <button type="submit" className="btn-primary" disabled={busy || !hasChanges}>
                  Save Changes
                </button>
                <button type="button" className="btn-ghost" onClick={cancelEditing} disabled={busy}>
                  Cancel
                </button>
              </div>
            ) : null}
          </section>
        </form>

        <form className="account-password-panel" onSubmit={handlePasswordSubmit}>
          <div className="account-info-row">
            <div className="account-info-head">
              <label htmlFor="account-new-password">Your password</label>
              {!isEditingPassword ? (
                <button type="button" className="account-inline-edit" onClick={startPasswordEditing}>
                  {hasGoogleLogin ? "Set Password" : "Change Password"}
                </button>
              ) : null}
            </div>

            {!isEditingPassword ? (
              <>
                <p className="account-readonly-value account-password-dots">************</p>
                <p className="account-password-note">
                  {hasGoogleLogin
                    ? "Google sign-in is linked. You can add a password too if you want email/password login."
                    : "Use your current password to choose a new one."}
                </p>
              </>
            ) : (
              <div className="account-password-fields">
                {!hasGoogleLogin ? (
                  <div className="field">
                    <label htmlFor="account-current-password">Current password</label>
                    <input
                      id="account-current-password"
                      name="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordFieldChange}
                      required
                    />
                  </div>
                ) : null}

                <div className="field">
                  <label htmlFor="account-new-password">New password</label>
                  <input
                    id="account-new-password"
                    name="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFieldChange}
                    minLength={8}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="account-confirm-password">Confirm new password</label>
                  <input
                    id="account-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFieldChange}
                    minLength={8}
                    required
                  />
                </div>

                <p className="account-password-note">
                  {hasGoogleLogin
                    ? "You can still keep using Google after setting a password."
                    : "Your new password must be at least 8 characters."}
                </p>

                <div className="actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      isSubmittingPassword
                      || passwordForm.newPassword.length < 8
                      || passwordForm.newPassword !== passwordForm.confirmPassword
                      || (!hasGoogleLogin && !passwordForm.currentPassword)
                    }
                  >
                    Save Password
                  </button>
                  <button type="button" className="btn-ghost" onClick={cancelPasswordEditing} disabled={isSubmittingPassword}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </article>
    </section>
  );
}
