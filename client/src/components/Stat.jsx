export default function Stat({ value, label, icon, tone = "neutral" }) {
  return (
    <div className="stat">
      {icon && <span className={`stat-icon stat-icon-${tone}`}>{icon}</span>}
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}