import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useAlerts } from "../contexts/AlertContext";
import { useAuth } from "../contexts/AuthContext";

const HERO_CHIPS = [
  "Create groups",
  "Track expenses",
  "Invite people"
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7968 2.7155v2.2582h2.9087c1.7027-1.5673 2.6845-3.8741 2.6845-6.6146z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8055 5.9564-2.1800l-2.9087-2.2582c-.8055.54-1.8355.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0364-3.71H.9573v2.3318A8.9999 8.9999 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.9636 10.71A5.4095 5.4095 0 013.6818 9c0-.5932.1023-1.17.2818-1.71V4.9582H.9573a8.9999 8.9999 0 000 8.0836L3.9636 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4632.8918 11.4268 0 9 0A8.9999 8.9999 0 00.9573 4.9582l3.0063 2.3318C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
      />
    </svg>
  );
}

function resetStatusCopy(status) {
  if (status === "valid") return "Link verified";
  if (status === "expired") return "Link expired";
  if (status === "used") return "Link already used";
  if (status === "invalid") return "Link invalid";
  return "Waiting for link";
}

function RotatingHeroChips() {
  const [activeChip, setActiveChip] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setActiveChip((currentChip) => (currentChip + 1) % HERO_CHIPS.length);
    }, 2400);

    return () => window.clearInterval(timerId);
  }, []);

  const orderedChips = HERO_CHIPS.map((_, index) => HERO_CHIPS[(activeChip + index) % HERO_CHIPS.length]);

  return (
    <div className="chip-row chip-row-rotating" aria-label="Core features">
      {orderedChips.map((chip, index) => {
        const isActive = index === 0;
        const chipPositionClass = index === 0
          ? "hero-rotating-chip-top"
          : index === 1
            ? "hero-rotating-chip-bottom-left"
            : "hero-rotating-chip-bottom-right";

        return (
          <motion.span
            key={chip}
            layout
            className={`chip hero-rotating-chip ${chipPositionClass} ${isActive ? "is-active" : ""}`.trim()}
            animate={{
              opacity: isActive ? 1 : 0.82,
              scale: isActive ? 1.03 : 0.98,
              y: isActive ? -2 : 0
            }}
            transition={{
              layout: { type: "spring", stiffness: 320, damping: 26 },
              duration: 0.35,
              ease: "easeOut"
            }}
          >
            {chip}
          </motion.span>
        );
      })}
    </div>
  );
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
    onGoogleLogin,
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
        <div className="hero-panel-grid">
          <div className="hero-copy">
            <h2>Split bills with your group.</h2>
            <p>Create a group, track expenses, and invite people in without extra setup noise.</p>
            <RotatingHeroChips />
          </div>
        </div>
      </article>

      <article className="card panel auth-form">
        <div className="auth-form-head">
          {isResetRequest ? <h3>Reset Password</h3> : null}
          {isResetPassword ? <h3>Choose New Password</h3> : null}
          {isLogin || isSignup ? <h3>{isLogin ? "Login" : "Create account"}</h3> : null}
          {isSignup ? (
            <p className="auth-form-subtitle">Create your account and start splitting in minutes.</p>
          ) : null}
        </div>

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

              <div className="actions auth-submit-row">
                <button type="submit" className={isLogin ? "btn-primary" : "btn-secondary"} disabled={busy}>
                  {busy ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
                </button>
                <button
                  type="button"
                  className="btn-google-auth"
                  onClick={onGoogleLogin}
                  disabled={busy || googleButtonStatus === "loading" || googleButtonStatus === "unconfigured"}
                  aria-label={isLogin ? "Sign in with Google" : "Sign up with Google"}
                >
                  <span className="btn-google-auth-mark">
                    <GoogleMark />
                  </span>
                  <span className="btn-google-auth-copy">
                    {googleButtonStatus === "loading" ? "Loading Google" : "Google"}
                  </span>
                </button>
              </div>
            </form>
            {googleButtonStatus === "error" || googleButtonStatus === "unconfigured" ? (
              <p className="auth-hint">Google Sign-In is unavailable right now.</p>
            ) : null}
            <p className="auth-hint auth-hint-standalone">
              Use Google to sign in, or create an account automatically if you are new.
            </p>
            <p className="auth-link-row">
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

            <p className="auth-toggle auth-toggle-inline">
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
          <details className="reset-test-disclosure">
            <summary className="reset-test-summary">
              <span className="reset-test-badge">Dev only</span>
              <span>Password Reset Test Harness</span>
            </summary>
            <section className="reset-test-harness" data-testid="password-reset-harness">
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
          </details>
        ) : null}
      </article>
    </section>
  );
}
