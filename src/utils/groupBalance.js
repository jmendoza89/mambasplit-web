export function pickFirstNumber(candidates, fallback = 0) {
  const firstNonZero = candidates.find((value) => typeof value === "number" && Number.isFinite(value) && value !== 0);
  if (typeof firstNonZero === "number") return firstNonZero;

  const firstFinite = candidates.find((value) => typeof value === "number" && Number.isFinite(value));
  return typeof firstFinite === "number" ? firstFinite : fallback;
}

function getBalanceCandidates(source) {
  return [
    source?.netBalanceCents,
    source?.summary?.netBalanceCents
  ];
}

export function resolveGroupBalanceCents(...sources) {
  for (const source of sources) {
    const candidates = getBalanceCandidates(source);
    const hasFiniteCandidate = candidates.some((value) => typeof value === "number" && Number.isFinite(value));
    if (hasFiniteCandidate) {
      return pickFirstNumber(candidates);
    }
  }

  return 0;
}
