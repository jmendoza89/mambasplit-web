export default function Alerts({ error, success }) {
  return (
    <section className="alerts" aria-live="polite">
      {error ? <p className="alert">{error}</p> : null}
      {success ? <p className="alert alert-success">{success}</p> : null}
    </section>
  );
}
