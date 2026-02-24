export default function AuthView({
  authMode,
  displayName,
  email,
  password,
  busy,
  onSubmitAuth,
  onGoogleLogin,
  onToggleAuthMode,
  setDisplayName,
  setEmail,
  setPassword
}) {
  return (
    <section className="auth-wrap">
      <article className="card panel hero-panel">
        <h2>Track shared expenses with less friction.</h2>
        <p>Create your account, log in, and test group and invite flows quickly.</p>
        <div className="chip-row">
          <span className="chip">JWT Auth</span>
          <span className="chip">Groups</span>
          <span className="chip">Invites</span>
        </div>
      </article>

      <article className="card panel auth-form">
        <h3>{authMode === "login" ? "Login" : "Create account"}</h3>
        <form onSubmit={onSubmitAuth}>
          {authMode === "signup" ? (
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
              minLength={authMode === "signup" ? 8 : undefined}
              required
            />
          </div>

          <div className="actions">
            <button type="submit" className={authMode === "login" ? "btn-primary" : "btn-secondary"} disabled={busy}>
              {busy ? "Please wait..." : authMode === "login" ? "Login" : "Sign Up"}
            </button>
          </div>
        </form>
        <div className="actions">
          <button type="button" className="btn-secondary" onClick={onGoogleLogin} disabled={busy}>
            {authMode === "login" ? "Sign in with Google" : "Sign up with Google"}
          </button>
        </div>
        <p className="auth-hint">Use Google to sign in, or create an account automatically if you are new.</p>

        <p className="auth-toggle">
          {authMode === "login" ? "No account? " : "Already registered? "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onToggleAuthMode();
            }}
          >
            {authMode === "login" ? "Create one" : "Login"}
          </a>
        </p>
      </article>
    </section>
  );
}
