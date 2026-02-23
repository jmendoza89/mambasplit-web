import { useEffect, useMemo, useState } from "react";
import {
  authApi,
  clearSession,
  getAccessToken,
  getStoredUser,
  groupsApi,
  meApi,
  saveSession
} from "./api";

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [user, setUser] = useState(getStoredUser());
  const [me, setMe] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [activeView, setActiveView] = useState("dashboard");

  const [groupDetail, setGroupDetail] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [acceptToken, setAcceptToken] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const [busy, setBusy] = useState(false);

  const currentName = useMemo(() => (me && me.displayName) || (user && user.displayName) || "User", [me, user]);
  const currentEmail = useMemo(() => (me && me.email) || (user && user.email) || "-", [me, user]);
  const currentId = useMemo(() => (me && me.id) || (user && user.id) || "-", [me, user]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const displayedGroup = useMemo(() => {
    if (groupDetail && groupDetail.id === selectedGroupId) return groupDetail;
    return selectedGroup;
  }, [groupDetail, selectedGroup, selectedGroupId]);

  const members = useMemo(() => normalizeMembers(displayedGroup), [displayedGroup]);
  const expenses = useMemo(() => normalizeExpenses(displayedGroup), [displayedGroup]);
  const totalExpense = useMemo(
    () => expenses.reduce((sum, expense) => sum + toNumberAmount(expense.amount), 0),
    [expenses]
  );

  async function loadSessionData() {
    const meData = await meApi.fetchMe();
    setMe(meData);
    localStorage.setItem("mambasplit_user", JSON.stringify(meData));

    const groupData = await groupsApi.list();
    setGroups(groupData);
    setSelectedGroupId((prev) => {
      if (prev && groupData.some((group) => group.id === prev)) return prev;
      return (groupData[0] && groupData[0].id) || "";
    });
  }

  async function loadGroupDetail(groupId) {
    if (!groupId) return;
    setGroupLoading(true);
    setGroupError("");

    try {
      const detail = await groupsApi.details(groupId);
      setGroupDetail(detail);
    } catch (err) {
      setGroupDetail(null);
      setGroupError(err.message || "Group details are currently unavailable.");
    } finally {
      setGroupLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }

      try {
        await loadSessionData();
      } catch {
        clearSession();
        setUser(null);
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeView !== "group" || !selectedGroupId) return;

    if (groupDetail && groupDetail.id === selectedGroupId) return;
    loadGroupDetail(selectedGroupId);
  }, [activeView, selectedGroupId, groupDetail]);

  async function onSubmitAuth(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload =
        authMode === "login"
          ? await authApi.login(email.trim(), password)
          : await authApi.signup(email.trim(), password, displayName.trim());

      saveSession(payload);
      setUser(payload.user || null);
      await loadSessionData();
      setSuccess(authMode === "login" ? "Logged in." : "Account created.");
    } catch (err) {
      if (err.status === 401) {
        setError("Invalid credentials.");
      } else {
        setError(err.message || "Unable to complete request.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await authApi.logout();
    } catch {
      // Always clear local state on logout attempt.
    } finally {
      clearSession();
      setUser(null);
      setMe(null);
      setGroups([]);
      setSelectedGroupId("");
      setInviteResult(null);
      setGroupDetail(null);
      setGroupError("");
      setActiveView("dashboard");
      setAuthMode("login");
      setBusy(false);
    }
  }

  async function onCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const created = await groupsApi.create(newGroupName.trim());
      const updated = [...groups, created];
      setGroups(updated);
      setSelectedGroupId(created.id);
      setNewGroupName("");
      setSuccess("Group created.");
    } catch (err) {
      setError(err.message || "Could not create group.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateInvite(e) {
    e.preventDefault();
    if (!selectedGroupId || !inviteEmail.trim()) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const invite = await groupsApi.createInvite(selectedGroupId, inviteEmail.trim());
      setInviteResult(invite);
      setSuccess("Invite created.");
    } catch (err) {
      setInviteResult(null);
      setError(err.message || "Could not create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function onAcceptInvite(e) {
    e.preventDefault();
    if (!acceptToken.trim()) return;

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupsApi.acceptInvite(acceptToken.trim());
      await loadSessionData();
      setAcceptToken("");
      setSuccess("Invite accepted. Groups refreshed.");
    } catch (err) {
      setError(err.message || "Could not accept invite.");
    } finally {
      setBusy(false);
    }
  }

  async function onOpenGroupPage(groupId) {
    if (!groupId) return;
    setSelectedGroupId(groupId);
    setActiveView("group");
    await loadGroupDetail(groupId);
  }

  async function onCreateExpense(e) {
    e.preventDefault();
    if (!selectedGroupId || !expenseDescription.trim() || !expenseAmount.trim()) return;
    if (!isUuid(currentId)) {
      setError("Could not determine current user id for payer.");
      return;
    }

    const numericAmount = Number(expenseAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    const participants = buildExpenseParticipants(members, currentId);
    if (!participants.length) {
      setError("No valid participant ids found for this group.");
      return;
    }

    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await groupsApi.createEqualExpense(selectedGroupId, {
        description: expenseDescription.trim(),
        payerUserId: currentId,
        amountCents: Math.round(numericAmount * 100),
        participants
      });
      setExpenseDescription("");
      setExpenseAmount("");
      setSuccess("Expense added.");
      await loadGroupDetail(selectedGroupId);
    } catch (err) {
      setError(err.message || "Could not add expense.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="app-shell">
        <Header />
        <section className="card panel">Loading...</section>
      </main>
    );
  }

  return (
    <>
      <div className="page-bg" />
      <div className="orb orb-a" />
      <div className="orb orb-b" />

      <main className="app-shell">
        <Header />

        <section className="alerts" aria-live="polite">
          {error ? <p className="alert">{error}</p> : null}
          {success ? <p className="alert alert-success">{success}</p> : null}
        </section>

        {!getAccessToken() ? (
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

              <p className="auth-toggle">
                {authMode === "login" ? "No account? " : "Already registered? "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setError("");
                    setSuccess("");
                    setAuthMode(authMode === "login" ? "signup" : "login");
                  }}
                >
                  {authMode === "login" ? "Create one" : "Login"}
                </a>
              </p>
            </article>
          </section>
        ) : activeView === "dashboard" ? (
          <section className="dash-wrap">
            <article className="card panel">
              <div className="dash-top">
                <div>
                  <h2>Welcome, {currentName}</h2>
                  <p>React test dashboard for groups and invite workflows.</p>
                </div>
                <div className="dash-top-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => onOpenGroupPage(selectedGroupId)}
                    disabled={!selectedGroupId || busy}
                  >
                    Open Group Page
                  </button>
                  <button className="btn-ghost" type="button" onClick={onLogout} disabled={busy}>
                    Logout
                  </button>
                </div>
              </div>

              <div className="grid">
                <section className="card stat">
                  <h4>Display Name</h4>
                  <strong>{currentName}</strong>
                </section>
                <section className="card stat">
                  <h4>Email</h4>
                  <strong>{currentEmail}</strong>
                </section>
                <section className="card stat">
                  <h4>User ID</h4>
                  <strong>{currentId}</strong>
                </section>
              </div>

              <div className="workspace-grid">
                <article className="card panel section-panel">
                  <h3>Groups</h3>
                  <form className="inline-form" onSubmit={onCreateGroup}>
                    <input
                      type="text"
                      placeholder="New group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      maxLength={200}
                      required
                    />
                    <button type="submit" className="btn-secondary" disabled={busy}>
                      Create Group
                    </button>
                  </form>

                  <ul className="list">
                    {groups.map((group) => (
                      <li key={group.id} className={group.id === selectedGroupId ? "is-active" : ""}>
                        <div className="list-row">
                          <button
                            type="button"
                            className="list-btn"
                            onClick={() => setSelectedGroupId(group.id)}
                          >
                            <span>{group.name}</span>
                            <code>{group.id.slice(0, 8)}...</code>
                          </button>
                          <button
                            type="button"
                            className="btn-inline"
                            onClick={() => onOpenGroupPage(group.id)}
                          >
                            View
                          </button>
                        </div>
                      </li>
                    ))}
                    {!groups.length ? <li className="list-empty">No groups yet. Create one to start inviting.</li> : null}
                  </ul>
                </article>

                <article className="card panel section-panel">
                  <h3>Create Invite</h3>
                  <form onSubmit={onCreateInvite}>
                    <div className="field">
                      <label htmlFor="groupSelect">Group</label>
                      <select
                        id="groupSelect"
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        required
                        disabled={!groups.length}
                      >
                        {!groups.length ? <option value="">No groups available</option> : null}
                        {groups.map((group) => (
                          <option value={group.id} key={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label htmlFor="inviteEmail">Invite Email</label>
                      <input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@example.com"
                        required
                      />
                    </div>

                    <div className="actions">
                      <button type="submit" className="btn-primary" disabled={busy || !groups.length}>
                        Create Invite
                      </button>
                    </div>
                  </form>

                  {inviteResult ? (
                    <div className="result-box">
                      <p><strong>Token:</strong> <code>{inviteResult.token}</code></p>
                      <p><strong>Email:</strong> {inviteResult.email}</p>
                      <p><strong>Expires:</strong> {inviteResult.expiresAt}</p>
                    </div>
                  ) : null}
                </article>

                <article className="card panel section-panel">
                  <h3>Accept Invite</h3>
                  <form onSubmit={onAcceptInvite}>
                    <div className="field">
                      <label htmlFor="acceptToken">Invite Token</label>
                      <input
                        id="acceptToken"
                        type="text"
                        value={acceptToken}
                        onChange={(e) => setAcceptToken(e.target.value)}
                        placeholder="Paste invite token"
                        required
                      />
                    </div>
                    <div className="actions">
                      <button type="submit" className="btn-secondary" disabled={busy}>
                        Accept Invite
                      </button>
                    </div>
                  </form>
                </article>
              </div>
            </article>
          </section>
        ) : (
          <section className="dash-wrap">
            <article className="card panel">
              <div className="group-page-top">
                <button className="btn-ghost" type="button" onClick={() => setActiveView("dashboard")}>
                  Back to Dashboard
                </button>
                <div className="dash-top-actions">
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => loadGroupDetail(selectedGroupId)}
                    disabled={!selectedGroupId || groupLoading}
                  >
                    {groupLoading ? "Refreshing..." : "Refresh"}
                  </button>
                  <button className="btn-ghost" type="button" onClick={onLogout} disabled={busy}>
                    Logout
                  </button>
                </div>
              </div>

              <div className="group-hero">
                <h2>{displayedGroup?.name || "Group"}</h2>
                <p>Track members and expenses in one place.</p>
                <div className="chip-row">
                  <span className="chip chip-soft">ID: {selectedGroupId || "-"}</span>
                  <span className="chip chip-soft">Members: {members.length}</span>
                  <span className="chip chip-soft">Expenses: {expenses.length}</span>
                  <span className="chip chip-soft">Total: {formatMoney(totalExpense)}</span>
                </div>
              </div>

              {groupError ? <p className="alert">{groupError}</p> : null}

              {groupLoading ? (
                <section className="card panel section-panel">Loading group details...</section>
              ) : (
                <div className="group-grid">
                  <article className="card panel section-panel">
                    <h3>Members</h3>
                    {members.length ? (
                      <ul className="member-list">
                        {members.map((member, index) => (
                          <li key={member.id || `${member.name}-${index}`}>
                            <div className="avatar">{initials(member.name)}</div>
                            <div>
                              <strong>{member.name}</strong>
                              <p>{member.email || "No email on record"}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="list-empty">No members found for this group yet.</p>
                    )}
                  </article>

                  <div className="group-stack">
                    <article className="card panel section-panel">
                      <h3>Add Expense</h3>
                      <form onSubmit={onCreateExpense}>
                        <div className="field">
                          <label htmlFor="expenseDescription">Description</label>
                          <input
                            id="expenseDescription"
                            type="text"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            placeholder="Dinner, groceries, taxi..."
                            maxLength={200}
                            required
                          />
                        </div>

                        <div className="expense-form-grid">
                          <div className="field">
                            <label htmlFor="expenseAmount">Amount</label>
                            <input
                              id="expenseAmount"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={expenseAmount}
                              onChange={(e) => setExpenseAmount(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="actions">
                          <button
                            type="submit"
                            className="btn-primary"
                            disabled={busy || groupLoading || !selectedGroupId}
                          >
                            Add Expense
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="card panel section-panel">
                      <h3>Recent Expenses</h3>
                      {expenses.length ? (
                        <ul className="expense-list">
                          {expenses.map((expense, index) => (
                            <li key={expense.id || `${expense.description}-${index}`}>
                              <div>
                                <strong>{expense.description || "Expense"}</strong>
                                <p>
                                  Paid by {expense.paidBy || "Unknown"}
                                  {expense.createdAt ? ` • ${formatDate(expense.createdAt)}` : ""}
                                </p>
                              </div>
                              <span>{formatMoney(expense.amount, expense.currency)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="list-empty">No expenses yet. Use the form above to add the first one.</p>
                      )}
                    </article>
                  </div>
                </div>
              )}
            </article>
          </section>
        )}
      </main>
    </>
  );
}

function Header() {
  return (
    <header className="brand-row">
      <div className="brand-mark" aria-hidden="true" />
      <div>
        <h1>MambaSplit</h1>
        <p>Simple split expenses, fast.</p>
      </div>
    </header>
  );
}

function normalizeMembers(group) {
  if (!group) return [];
  const rawMembers = group.members || group.participants || group.users || [];

  return rawMembers.map((member, index) => {
    if (typeof member === "string") {
      return {
        id: `member-${index}`,
        name: member,
        email: ""
      };
    }

    return {
      id: member.id || member.userId || `member-${index}`,
      name: member.displayName || member.name || member.email || "Unnamed member",
      email: member.email || ""
    };
  });
}

function normalizeExpenses(group) {
  if (!group) return [];
  const rawExpenses = group.expenses || group.items || group.transactions || [];

  return rawExpenses.map((expense, index) => ({
    id: expense.id || `expense-${index}`,
    description: expense.description || expense.title || "Expense",
    amount: expense.amount,
    currency: expense.currency || "USD",
    paidBy: expense.paidBy || expense.payerName || expense.payer?.displayName || "Unknown",
    createdAt: expense.createdAt || expense.date || null
  }));
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function toNumberAmount(amount) {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (amount && typeof amount === "object") {
    if (typeof amount.value === "number") return amount.value;
    if (typeof amount.amount === "number") return amount.amount;
    if (typeof amount.amountCents === "number") return amount.amountCents / 100;
    if (typeof amount.value === "string") {
      const parsed = Number(amount.value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

function formatMoney(amount, currency = "USD") {
  const value = toNumberAmount(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(value);
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildExpenseParticipants(groupMembers, payerId) {
  const ids = groupMembers.map((member) => member.id).filter(isUuid);
  if (!ids.includes(payerId)) ids.push(payerId);
  return Array.from(new Set(ids));
}

