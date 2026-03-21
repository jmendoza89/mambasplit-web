import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";

function resetStatusCopy(status) {
  if (status === "valid") return "Link verified";
  if (status === "expired") return "Link expired";
  if (status === "used") return "Link already used";
  if (status === "invalid") return "Link invalid";
  return "Waiting for link";
}

export default function AuthView() {
  const {
    authMode,
    displayName,
    email,
    password,
    resetConfirmPassword,
    resetTokenStatus,
    passwordResetOutbox,
    passwordResetTestValue,
    showResetTestHarness,
    onSubmitAuth,
    googleButtonRef,
    googleButtonStatus,
    onToggleAuthMode,
    onStartPasswordReset,
    onReturnToLogin,
    onRequestPasswordReset,
    onOpenPasswordResetLink,
    onSubmitPasswordReset,
    setDisplayName,
    setEmail,
    setPassword,
    setResetConfirmPassword
  } = useAuth();

  const { busy } = useAlerts();
  const isLogin = authMode === "login";
  const isSignup = authMode === "signup";
  const isResetRequest = authMode === "resetRequest";
  const isResetPassword = authMode === "resetPassword";

  return (
    <section className="auth-wrap">
      <article className="card panel hero-panel">
        <h2>Track shared expenses with less friction.</h2>
        <p>Create your account, log in, and test group and invite flows quickly.</p>
        <div className="chip-row">
          <span className="chip">JWT Auth</span>
          <span className="chip">Groups</span>
          <span className="chip">Invites</span>
          <span className="chip">Password Reset</span>
        </div>
      </article>

      <article className="card panel auth-form">
        {isResetRequest ? <h3>Reset Password</h3> : null}
        {isResetPassword ? <h3>Choose New Password</h3> : null}
        {isLogin || isSignup ? <h3>{isLogin ? "Login" : "Create account"}</h3> : null}

        {isLogin || isSignup ? (
          <>
            <form onSubmit={onSubmitAuth}>
              {isSignup ? (
                <div className="field">
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={120}
                    required
                  />
                </div>
              ) : null}

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={isSignup ? 8 : undefined}
                  required
                />
              </div>

              <div className="actions">
                <button type="submit" className={isLogin ? "btn-primary" : "btn-secondary"} disabled={busy}>
                  {busy ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
                </button>
              </div>
            </form>

            <div className="actions">
              <div ref={googleButtonRef} aria-label={isLogin ? "Sign in with Google" : "Sign up with Google"} />
            </div>
            {googleButtonStatus === "loading" ? (
              <p className="auth-hint">Loading Google Sign-In...</p>
            ) : null}
            {googleButtonStatus === "error" || googleButtonStatus === "unconfigured" ? (
              <p className="auth-hint">Google Sign-In is unavailable right now.</p>
            ) : null}
            <p className="auth-hint">Use Google to sign in, or create an account automatically if you are new.</p>
            <p className="auth-hint">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onStartPasswordReset(email);
                }}
              >
                Forgot password?
              </a>
            </p>

            <p className="auth-toggle">
              {isLogin ? "No account? " : "Already registered? "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleAuthMode();
                }}
              >
                {isLogin ? "Create one" : "Login"}
              </a>
            </p>
          </>
        ) : null}

        {isResetRequest ? (
          <>
            <form onSubmit={onRequestPasswordReset}>
              <div className="field">
                <label htmlFor="resetEmail">Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Please wait..." : "Send Reset Link"}
                </button>
                <button type="button" className="btn-ghost" onClick={onReturnToLogin} disabled={busy}>
                  Back to Login
                </button>
              </div>
            </form>
          </>
        ) : null}

        {isResetPassword ? (
          <>
            <p className={`reset-link-status reset-link-status-${resetTokenStatus}`}>
              {resetStatusCopy(resetTokenStatus)}
            </p>
            <form onSubmit={onSubmitPasswordReset}>
              <div className="field">
                <label htmlFor="resetEmailReadonly">Email</label>
                <input id="resetEmailReadonly" type="email" value={email} readOnly />
              </div>
              <div className="field">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn-primary" disabled={busy || resetTokenStatus !== "valid"}>
                  {busy ? "Please wait..." : "Reset Password"}
                </button>
                <button type="button" className="btn-ghost" onClick={onReturnToLogin} disabled={busy}>
                  Back to Login
                </button>
              </div>
            </form>
          </>
        ) : null}

        {showResetTestHarness ? (
          <section className="reset-test-harness" data-testid="password-reset-harness">
            <h4>Password Reset Test Harness</h4>
            {passwordResetOutbox ? (
              <>
                <p>
                  Last mock email sent to: <strong>{passwordResetOutbox.toEmail}</strong>
                </p>
                <code className="reset-test-link">{passwordResetOutbox.link}</code>
                <div className="actions">
                  <button
                    type="button"
                    className="btn-inline"
                    onClick={() => onOpenPasswordResetLink(passwordResetOutbox.link)}
                  >
                    Open Reset Link
                  </button>
                </div>
              </>
            ) : (
              <p>No mock reset email sent yet.</p>
            )}

            <div className="reset-test-password-box">
              <span>Submitted password (test only):</span>
              <strong>{passwordResetTestValue || "-"}</strong>
            </div>
          </section>
        ) : null}
      </article>
    </section>
  );
}
