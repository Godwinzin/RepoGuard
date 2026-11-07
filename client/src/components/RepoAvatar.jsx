const TONES = 5;

function hash(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default function RepoAvatar({ name, size = 40 }) {
  return (
    <span
      className={`avatar-tile tone-${hash(name) % TONES}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}