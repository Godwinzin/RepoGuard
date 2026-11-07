export default function Logo({ size = 28, withText = true }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path
          className="logo-shield"
          d="M16 2.5 4.5 7v8.2c0 6.9 4.9 12.4 11.5 14.3 6.6-1.9 11.5-7.4 11.5-14.3V7L16 2.5Z"
        />
        <path
          d="m10.8 16.2 3.6 3.6 6.9-7.4"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && (
        <span className="logo-text">
          Repo<span>Guard</span>
        </span>
      )}
    </span>
  );
}