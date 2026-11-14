export default function Stat({ value, label, icon, tone = "neutral", delta = null }) {
  return (
    <div className="stat">
      {icon && <span className={`stat-icon stat-icon-${tone}`}>{icon}</span>}
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {delta && (
          <div className={`stat-delta stat-delta-${delta.tone}`}>
            {delta.arrow && <span aria-hidden="true">{delta.arrow}</span>}
            <span>{delta.text}</span>
            {delta.note && <span className="stat-delta-note">{delta.note}</span>}
          </div>
        )}
      </div>
    </div>
  );
}