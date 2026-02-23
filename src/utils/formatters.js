export function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function toNumberAmount(amount) {
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

export function formatMoney(amount, currency = "USD") {
  const value = toNumberAmount(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(value);
}

export function formatDate(value) {
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

export function isUuid(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
