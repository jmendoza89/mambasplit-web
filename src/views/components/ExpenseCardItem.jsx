import { formatMoney } from "../../utils/formatters";

function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

function isSameId(a, b) {
  return normalizeText(a) && normalizeText(a) === normalizeText(b);
}

function isCurrentUserName(name, currentUserName) {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return false;
  if (normalizedName === "you") return true;
  return normalizedName === normalizeText(currentUserName);
}

function formatDateStack(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      monthShort: "---",
      dayNumber: "--"
    };
  }

  return {
    monthShort: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    dayNumber: String(date.getDate())
  };
}

function computeSplitAmountCents(expense, currentUserId, isCurrentUserPayer) {
  const splits = Array.isArray(expense?.splits) ? expense.splits : [];

  if (isCurrentUserPayer) {
    const owedByOthersCents = splits
      .filter((split) => split?.userId && split.userId !== currentUserId)
      .reduce((sum, split) => sum + (split?.amountOwedCents || 0), 0);

    return Math.max(0, owedByOthersCents);
  }

  const currentUserShareCents = splits
    .filter((split) => split?.userId === currentUserId)
    .reduce((sum, split) => sum + (split?.amountOwedCents || 0), 0);

  return Math.max(0, currentUserShareCents);
}

function resolveIsCurrentUserPayer(expense, currentUserId, currentUserName) {
  const payerIdMatches = isSameId(expense?.payerUserId, currentUserId);
  const payerName = (expense?.paidBy || "").trim();
  const hasExplicitPayerName = Boolean(payerName) && normalizeText(payerName) !== "unknown";
  const payerNameMatchesCurrentUser = isCurrentUserName(payerName, currentUserName);

  if (hasExplicitPayerName && payerIdMatches && !payerNameMatchesCurrentUser) {
    return false;
  }

  return payerIdMatches || payerNameMatchesCurrentUser;
}

function buildExpenseCardViewModel(expense, currentUserId, currentUserName) {
  const amountCents = typeof expense?.amountCents === "number" ? expense.amountCents : 0;
  const isCurrentUserPayer = resolveIsCurrentUserPayer(expense, currentUserId, currentUserName);
  const payerName = (expense?.paidBy || "Unknown").trim() || "Unknown";
  const payerDisplayLabel = `${isCurrentUserPayer ? "you" : payerName} paid`;
  const splitTone = isCurrentUserPayer ? "positive" : "negative";
  const splitDisplayLabel = isCurrentUserPayer ? "you lent" : "you owe";
  const splitAmountCents = computeSplitAmountCents(expense, currentUserId, isCurrentUserPayer);

  return {
    title: expense?.description || "Expense",
    payerDisplayLabel,
    totalAmountLabel: formatMoney(amountCents / 100, expense?.currency || "USD"),
    splitDisplayLabel,
    splitAmountLabel: formatMoney(splitAmountCents / 100, expense?.currency || "USD"),
    splitTone,
    isCurrentUserPayer,
    ...formatDateStack(expense?.createdAt)
  };
}

export default function ExpenseCardItem({
  expense,
  currentUserId,
  currentUserName,
  onDeleteExpense = () => {},
  deleteDisabled = false,
  deleteTitle = "Delete this expense",
  showDeleteButton = true
}) {
  const view = buildExpenseCardViewModel(expense, currentUserId, currentUserName);
  const isDeleteDisabled = deleteDisabled || !view.isCurrentUserPayer;

  return (
    <>
      <div className="expense-date-stack" aria-label={`Expense date ${view.monthShort} ${view.dayNumber}`}>
        <span className="expense-date-month">{view.monthShort}</span>
        <span className="expense-date-day">{view.dayNumber}</span>
      </div>

      <div className="expense-main">
        <strong className="expense-title">{view.title}</strong>
      </div>

      <div className="expense-summary" role="group" aria-label="Expense payment summary">
        <div className="expense-summary-column">
          <span className="expense-summary-label">{view.payerDisplayLabel}</span>
          <strong className="expense-summary-amount">{view.totalAmountLabel}</strong>
        </div>
        <div className="expense-summary-column">
          <span className="expense-summary-label">{view.splitDisplayLabel}</span>
          <strong className={`expense-summary-amount expense-split-amount ${view.splitTone === "positive" ? "is-positive" : "is-negative"}`}>
            {view.splitAmountLabel}
          </strong>
        </div>
      </div>

      {showDeleteButton ? (
        <button
          className="expense-delete-icon"
          type="button"
          aria-label="Delete expense"
          onClick={() => onDeleteExpense(expense?.id)}
          disabled={isDeleteDisabled}
          title={deleteTitle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4a1 1 0 1 1 0 2h-1.1l-.71 11.02A2.25 2.25 0 0 1 14.94 20H9.06a2.25 2.25 0 0 1-2.25-1.98L6.1 7H5a1 1 0 1 1 0-2h4V3.75Zm4 1.25V3.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25V5h3Zm-4.89 2 .69 10.89a.25.25 0 0 0 .25.22h5.88a.25.25 0 0 0 .25-.22L15.89 7H8.11Zm2.39 2.5a1 1 0 0 1 1 1v4.5a1 1 0 1 1-2 0V10.5a1 1 0 0 1 1-1Zm3 0a1 1 0 0 1 1 1v4.5a1 1 0 1 1-2 0V10.5a1 1 0 0 1 1-1Z" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
