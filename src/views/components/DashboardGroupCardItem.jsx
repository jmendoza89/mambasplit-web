import { formatMoney, initials } from "../../utils/formatters";

function pickFirstNumber(candidates, fallback = 0) {
  const found = candidates.find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof found === "number" ? found : fallback;
}

function resolveGroupBalanceCents(group) {
  return pickFirstNumber([
    group?.myNetBalanceCents,
    group?.netBalanceCents,
    group?.myBalanceCents,
    group?.balanceCents,
    group?.summary?.myNetBalanceCents,
    group?.summary?.netBalanceCents,
    group?.summary?.myBalanceCents,
    group?.summary?.balanceCents
  ]);
}

function getBalancePresentation(balanceCents) {
  const amount = Math.abs(balanceCents || 0) / 100;
  if ((balanceCents || 0) > 0) {
    return { className: "gets-back", label: `you get back ${formatMoney(amount)}` };
  }
  if ((balanceCents || 0) < 0) {
    return { className: "owes", label: `you owe ${formatMoney(amount)}` };
  }
  return { className: "settled", label: "settled up" };
}

function buildGroupMeta(group) {
  const memberCount = pickFirstNumber([group?.memberCount, group?.summary?.memberCount], null);
  const expenseCount = pickFirstNumber([group?.expenseCount, group?.summary?.expenseCount], null);
  const settlementCount = pickFirstNumber([group?.settlementCount, group?.summary?.settlementCount], null);

  const parts = [];
  if (typeof memberCount === "number") parts.push(`${memberCount} member${memberCount === 1 ? "" : "s"}`);
  if (typeof expenseCount === "number") parts.push(`${expenseCount} expense${expenseCount === 1 ? "" : "s"}`);
  if (typeof settlementCount === "number") parts.push(`${settlementCount} settlement${settlementCount === 1 ? "" : "s"}`);

  return parts.join(" | ") || "";
}

export default function DashboardGroupCardItem({
  group,
  isOwned,
  isActive,
  onSelect,
  onOpen
}) {
  const balance = getBalancePresentation(resolveGroupBalanceCents(group));
  const meta = buildGroupMeta(group);

  return (
    <li
      className={[
        "group-summary-card",
        isActive ? "is-active" : "",
        isOwned ? "group-owner" : "group-member"
      ].filter(Boolean).join(" ")}
    >
      <div className="group-summary-row">
        <button
          type="button"
          className="group-summary-select"
          onClick={() => onSelect(group.id)}
        >
          <span className="member-avatar-wrap group-summary-avatar-wrap">
            <span className={`avatar group-summary-avatar ${isOwned ? "avatar-owner" : ""}`.trim()}>{initials(group.name)}</span>
            {isOwned ? <span className="member-owner-crown" aria-label="Group owner" title="Group owner" /> : null}
          </span>
          <span className="group-summary-content">
            <span className="group-name-stack">
              <span className="group-summary-title">{group.name}</span>
            </span>
            <span className={`group-summary-balance ${balance.className}`}>{balance.label}</span>
            {meta ? <span className="group-summary-meta">{meta}</span> : null}
          </span>
        </button>
        <button
          type="button"
          className="btn-inline group-summary-open"
          onClick={() => onOpen(group.id)}
        >
          <span className="group-summary-open-icon" aria-hidden="true">{">"}</span>
          <span>View</span>
        </button>
      </div>
    </li>
  );
}
