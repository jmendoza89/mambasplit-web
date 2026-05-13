import { useSyncExternalStore } from "react";

const EMPTY_SNAPSHOT = {
  metrics: null,
  samples: [],
  groupOpenStartedAt: null
};

let snapshot = EMPTY_SNAPSHOT;
const listeners = new Set();

function emit(nextSnapshot) {
  snapshot = nextSnapshot;
  for (const listener of listeners) {
    listener();
  }
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0;
}

function readTotal(summary, key, fallback) {
  return typeof summary?.[key] === "number" ? summary[key] : fallback;
}

function getNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function createMetrics(details, metadata) {
  const expensesReturned = countItems(details?.expenses);
  const settlementsReturned = countItems(details?.settlements);
  const summary = details?.summary || {};

  return {
    fetchMs: metadata?.fetchMs || 0,
    payloadKb: metadata?.payloadKb || 0,
    renderMs: null,
    expensesReturned,
    expensesTotal: readTotal(summary, "expenseCount", expensesReturned),
    settlementsReturned,
    settlementsTotal: readTotal(summary, "settlementCount", settlementsReturned),
    hasMoreExpenses: Boolean(details?.hasMoreExpenses),
    hasMoreSettlements: Boolean(details?.hasMoreSettlements),
    measuredAt: new Date().toISOString()
  };
}

export const devPerfStore = {
  subscribe(listener) {
    if (!import.meta.env.DEV) return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot() {
    return import.meta.env.DEV ? snapshot : EMPTY_SNAPSHOT;
  },

  startGroupOpen() {
    if (!import.meta.env.DEV) return;
    emit({
      ...snapshot,
      groupOpenStartedAt: getNow()
    });
  },

  recordGroupDetailsFetch(details, metadata) {
    if (!import.meta.env.DEV) return;
    const metrics = createMetrics(details, metadata);
    emit({
      ...snapshot,
      metrics,
      samples: [metrics, ...snapshot.samples].slice(0, 10)
    });
  },

  recordGroupRenderComplete() {
    if (!import.meta.env.DEV || !snapshot.metrics || snapshot.metrics.renderMs !== null) return;
    const startedAt = snapshot.groupOpenStartedAt;
    emit({
      ...snapshot,
      metrics: {
        ...snapshot.metrics,
        renderMs: startedAt ? getNow() - startedAt : null
      },
      samples: snapshot.samples.map((sample, index) => index === 0
        ? { ...sample, renderMs: startedAt ? getNow() - startedAt : null }
        : sample)
    });
  }
};

export function useDevPerfSnapshot() {
  return useSyncExternalStore(
    devPerfStore.subscribe,
    devPerfStore.getSnapshot,
    devPerfStore.getSnapshot
  );
}
