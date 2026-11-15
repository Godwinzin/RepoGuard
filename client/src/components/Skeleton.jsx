export function Skeleton({ width = "100%", height = 16, radius, className = "" }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function StatSkeleton() {
  return (
    <div className="stat">
      <Skeleton width={40} height={40} radius="12px" />
      <div className="stack" style={{ flex: 1 }}>
        <Skeleton width="50%" height={22} />
        <Skeleton width="70%" height={12} />
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <li className="list-item">
      <div className="stack" style={{ flex: 1 }}>
        <Skeleton width="35%" height={16} />
        <Skeleton width="60%" height={12} />
      </div>
      <Skeleton width={88} height={36} radius="10px" />
    </li>
  );
}

export function FindingSkeleton() {
  return (
    <div className="finding">
      <div className="finding-summary-skeleton">
        <Skeleton width={72} height={22} radius="999px" />
        <Skeleton width="55%" height={16} />
      </div>
    </div>
  );
}