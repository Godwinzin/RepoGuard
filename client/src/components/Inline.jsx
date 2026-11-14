export default function Inline({ text }) {
  return (
    <>
      {String(text ?? "")
        .split("`")
        .map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part))}
    </>
  );
}