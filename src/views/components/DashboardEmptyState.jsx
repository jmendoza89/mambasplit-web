export default function DashboardEmptyState({
  title,
  detail,
  icon = "o",
  className = "",
  as = "div"
}) {
  const Element = as;

  function renderIcon() {
    if (icon === "envelope") {
      return (
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M4.5 7.5h15a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7a1 1 0 0 1 1-1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="m5.5 8.5 6.5 5 6.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    return icon;
  }

  return (
    <Element className={["dashboard-empty-state", className].filter(Boolean).join(" ")}>
      <span className="dashboard-empty-icon" aria-hidden="true">{renderIcon()}</span>
      <div className="dashboard-empty-copy">
        <p className="dashboard-empty-title">{title}</p>
        {detail ? <p className="dashboard-empty-detail">{detail}</p> : null}
      </div>
    </Element>
  );
}
