import { formatMoney, initials } from "../../utils/formatters";

function getBalancePresentation(netBalanceCents) {
  const amount = (netBalanceCents || 0) / 100;
  if (amount > 0) {
    return {
      className: "member-balance gets-back",
      label: `gets back ${formatMoney(amount)}`
    };
  }
  if (amount < 0) {
    return {
      className: "member-balance owes",
      label: `owes ${formatMoney(Math.abs(amount))}`
    };
  }
  return {
    className: "member-balance settled",
    label: "settled up"
  };
}

export default function MemberCardItem({ member, isOwner }) {
  const { className, label } = getBalancePresentation(member?.netBalanceCents);

  return (
    <div className={`member-card ${isOwner ? "member-card-owner" : ""}`.trim()}>
      <div className="member-avatar-wrap">
        <div className={`avatar ${isOwner ? "avatar-owner" : ""}`.trim()}>{initials(member?.name)}</div>
        {isOwner ? <span className="member-owner-crown" aria-label="Group owner" title="Group owner" /> : null}
      </div>
      <div className="member-main">
        <strong className="member-name">{member?.name || "Member"}</strong>
        <p className={className}>{label}</p>
      </div>
    </div>
  );
}
