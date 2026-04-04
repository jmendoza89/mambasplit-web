import { motion } from "motion/react";
import { formatMoney } from "../../utils/formatters";

export default function GroupDetailsHero({
  groupName,
  netBalanceCents
}) {
  const netBalance = (netBalanceCents || 0) / 100;
  const netBalanceAmount = Math.abs(netBalance);
  const netBalanceTone = netBalance > 0 ? "is-positive" : netBalance < 0 ? "is-negative" : "";
  const netBalanceContext = netBalance > 0 ? "You are owed" : netBalance < 0 ? "You owe" : "You are settled up";

  return (
    <motion.div
      className="group-hero"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="group-hero-header">
        <div className="group-hero-copy">
          <h2>{groupName || "Group"}</h2>
        </div>
        <div className="group-hero-balance">
          <span className="group-hero-balance-label">{netBalanceContext}</span>
          <div className="group-hero-balance-main">
            <strong className={`group-hero-balance-value ${netBalanceTone}`.trim()}>{formatMoney(netBalanceAmount)}</strong>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
