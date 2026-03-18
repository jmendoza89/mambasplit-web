export default function DashboardEmptyState({
  title,
  detail,
  icon = "o",
  className = "",
  as = "div"
}) {
  const Element = as;
  return (
    <Element className={["dashboard-empty-state", className].filter(Boolean).join(" ")}>
      <span className="dashboard-empty-icon" aria-hidden="true">{icon}</span>
      <div className="dashboard-empty-copy">
        <p className="dashboard-empty-title">{title}</p>
        {detail ? <p className="dashboard-empty-detail">{detail}</p> : null}
      </div>
    </Element>
  );
}
