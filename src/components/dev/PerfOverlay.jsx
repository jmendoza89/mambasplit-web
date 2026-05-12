import { useState } from "react";
import { useDevPerfSnapshot } from "../../stores/devPerfStore";

function formatMs(value) {
  return typeof value === "number" ? value.toFixed(1) : "-";
}

function formatKb(value) {
  return typeof value === "number" ? value.toFixed(1) : "-";
}

function formatCount(returned, total) {
  if (typeof returned !== "number" || typeof total !== "number") return "-";
  return `${returned} / ${total}`;
}

function median(values) {
  const sorted = values.filter((value) => typeof value === "number").sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.floor(sorted.length / 2)];
}

function buildReport(samples) {
  const recent = samples.slice(0, 5);
  const p50Fetch = median(recent.map((sample) => sample.fetchMs));
  const p50Render = median(recent.map((sample) => sample.renderMs));
  const p50Payload = median(recent.map((sample) => sample.payloadKb));
  const latest = recent[0] || null;

  return [
    "# Frontend perf sample",
    "",
    `Recorded: ${new Date().toISOString()}`,
    `Sample count: ${recent.length}`,
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Group details fetch ms p50 | ${formatMs(p50Fetch)} |`,
    `| Group open render ms p50 | ${formatMs(p50Render)} |`,
    `| Payload size KB p50 | ${formatKb(p50Payload)} |`,
    `| Expenses returned / total | ${latest ? formatCount(latest.expensesReturned, latest.expensesTotal) : "-"} |`,
    `| Settlements returned / total | ${latest ? formatCount(latest.settlementsReturned, latest.settlementsTotal) : "-"} |`,
    `| Has more expenses | ${latest ? String(latest.hasMoreExpenses) : "-"} |`,
    `| Has more settlements | ${latest ? String(latest.hasMoreSettlements) : "-"} |`,
    "",
    "## Samples",
    "",
    "| Run | Fetch ms | Render ms | Payload KB | Expenses | Settlements | More expenses | More settlements |",
    "|---:|---:|---:|---:|---:|---:|---|---|",
    ...recent.map((sample, index) => [
      `| ${index + 1}`,
      formatMs(sample.fetchMs),
      formatMs(sample.renderMs),
      formatKb(sample.payloadKb),
      formatCount(sample.expensesReturned, sample.expensesTotal),
      formatCount(sample.settlementsReturned, sample.settlementsTotal),
      String(sample.hasMoreExpenses),
      `${String(sample.hasMoreSettlements)} |`
    ].join(" | "))
  ].join("\n");
}

export default function PerfOverlay() {
  const { metrics, samples } = useDevPerfSnapshot();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copyStatus, setCopyStatus] = useState("");

  if (!import.meta.env.DEV) return null;

  async function copyReport() {
    if (!samples.length || !navigator.clipboard) return;
    await navigator.clipboard.writeText(buildReport(samples));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(""), 1200);
  }

  return (
    <aside className={`dev-perf-overlay ${isCollapsed ? "is-collapsed" : ""}`.trim()}>
      <button
        type="button"
        className="dev-perf-toggle"
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-expanded={!isCollapsed}
      >
        Perf
      </button>

      {!isCollapsed ? (
        <div className="dev-perf-panel">
          <dl>
            <div>
              <dt>Fetch ms</dt>
              <dd>{formatMs(metrics?.fetchMs)}</dd>
            </div>
            <div>
              <dt>Render ms</dt>
              <dd>{formatMs(metrics?.renderMs)}</dd>
            </div>
            <div>
              <dt>Payload KB</dt>
              <dd>{formatKb(metrics?.payloadKb)}</dd>
            </div>
            <div>
              <dt>Expenses</dt>
              <dd>{formatCount(metrics?.expensesReturned, metrics?.expensesTotal)}</dd>
            </div>
            <div>
              <dt>Settlements</dt>
              <dd>{formatCount(metrics?.settlementsReturned, metrics?.settlementsTotal)}</dd>
            </div>
            <div>
              <dt>More expenses</dt>
              <dd>{metrics ? String(metrics.hasMoreExpenses) : "-"}</dd>
            </div>
            <div>
              <dt>More settlements</dt>
              <dd>{metrics ? String(metrics.hasMoreSettlements) : "-"}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="dev-perf-copy"
            onClick={copyReport}
            disabled={!samples.length}
          >
            {copyStatus || `Copy report (${Math.min(samples.length, 5)}/5)`}
          </button>
          <p>{metrics?.measuredAt ? new Date(metrics.measuredAt).toLocaleTimeString() : "No group fetch yet"}</p>
        </div>
      ) : null}
    </aside>
  );
}
