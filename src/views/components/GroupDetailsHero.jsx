import { motion } from "motion/react";
import { useState } from "react";
import { formatDate, formatMoney } from "../../utils/formatters";

export default function GroupDetailsHero({
  groupName,
  createdAt,
  memberCount,
  expenseCount,
  totalExpense,
  settlementCount,
  totalSettlementAmount,
  netBalanceCents,
  role,
  isGroupOwner
}) {
  const netBalance = (netBalanceCents || 0) / 100;
  const netBalanceAmount = Math.abs(netBalance);
  const netBalanceTone = netBalance > 0 ? "is-positive" : netBalance < 0 ? "is-negative" : "";
  const netBalanceContext = netBalance > 0 ? "You are owed" : netBalance < 0 ? "You owe" : "You are settled up";
  const roleLabel = isGroupOwner ? "OWNER" : role;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const heroStats = [
    { label: "Members", value: memberCount },
    { label: "Expenses", value: expenseCount },
    { label: "Total Spent", value: formatMoney(totalExpense) },
    { label: "Settlements", value: settlementCount }
  ];

  return (
    <motion.div
      className="group-hero"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="group-hero-header">
        <div className="group-hero-copy">
          <p className="group-hero-kicker">Group Details</p>
          <h2>{groupName || "Group"}</h2>
        </div>
        <div className="group-hero-balance">
          <span className="group-hero-balance-label">{netBalanceContext}</span>
          <div className="group-hero-balance-main">
            <strong className={`group-hero-balance-value ${netBalanceTone}`.trim()}>{formatMoney(netBalanceAmount)}</strong>
            <span className="group-hero-role">Role: {roleLabel || "MEMBER"}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`group-hero-mobile-toggle ${detailsOpen ? "is-open" : ""}`.trim()}
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((prev) => !prev)}
      >
        {detailsOpen ? "Hide group stats" : "Show group stats"}
      </button>

      <div className={`group-hero-details ${detailsOpen ? "is-open" : ""}`.trim()}>
        <div className="group-stat-grid">
          {heroStats.map((stat, index) => (
            <motion.article
              key={stat.label}
              className="group-stat-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.05 + (index * 0.04), ease: "easeOut" }}
            >
              <span className="group-stat-label">{stat.label}</span>
              <strong className="group-stat-value">{stat.value}</strong>
            </motion.article>
          ))}
        </div>

        <div className="group-meta-row">
          <span>Created {formatDate(createdAt)}</span>
          <span>Settled volume {formatMoney(totalSettlementAmount)}</span>
        </div>
      </div>
    </motion.div>
  );
}
