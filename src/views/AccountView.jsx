import { useEffect, useState } from "react";
import { initials } from "../utils/formatters";

export default function AccountView({
  currentName,
  currentEmail,
  currentPhone,
  currentAvatarUrl,
  busy,
  onBackToDashboard,
  onSaveAccountProfile
}) {
  const [form, setForm] = useState({
    displayName: currentName || "",
    email: currentEmail === "-" ? "" : currentEmail || "",
    phone: currentPhone || "",
    avatarUrl: currentAvatarUrl || ""
  });

  useEffect(() => {
    setForm({
      displayName: currentName || "",
      email: currentEmail === "-" ? "" : currentEmail || "",
      phone: currentPhone || "",
      avatarUrl: currentAvatarUrl || ""
    });
  }, [currentName, currentEmail, currentPhone, currentAvatarUrl]);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, avatarUrl: typeof reader.result === "string" ? reader.result : prev.avatarUrl }));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSaveAccountProfile(form);
  }

  return (
    <section className="dash-wrap">
      <article className="card panel account-page">
        <div className="account-page-top">
          <button className="btn-ghost" type="button" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>

        <h2>Your account</h2>

        <form className="account-layout" onSubmit={handleSubmit}>
          <section className="account-avatar-panel">
            {form.avatarUrl ? (
              <img className="account-avatar-image" src={form.avatarUrl} alt={`${form.displayName || "User"} avatar`} />
            ) : (
              <div className="account-avatar-fallback" aria-hidden="true">{initials(form.displayName || currentName)}</div>
            )}

            <label className="account-file-label" htmlFor="accountAvatar">
              Change your avatar
            </label>
            <input id="accountAvatar" type="file" accept="image/*" onChange={handleAvatarChange} />
          </section>

          <section className="account-fields">
            <label htmlFor="accountDisplayName">Your name</label>
            <input id="accountDisplayName" name="displayName" value={form.displayName} onChange={handleFieldChange} required />

            <label htmlFor="accountEmail">Your email address</label>
            <input id="accountEmail" name="email" type="email" value={form.email} onChange={handleFieldChange} required />

            <label htmlFor="accountPhone">Your phone number</label>
            <input id="accountPhone" name="phone" type="tel" value={form.phone} onChange={handleFieldChange} placeholder="Add a phone number" />

            <label htmlFor="accountPassword">Your password</label>
            <input id="accountPassword" type="password" value="************" disabled readOnly />
            <p className="account-password-note">Password updates are not available in this screen yet.</p>

            <div className="actions">
              <button type="submit" className="btn-primary" disabled={busy}>
                Save Profile
              </button>
            </div>
          </section>
        </form>
      </article>
    </section>
  );
}
