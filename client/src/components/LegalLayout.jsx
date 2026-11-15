export default function LegalLayout({ title, updated, toc, children }) {
  return (
    <div className="docs-layout">
      <nav className="docs-toc" aria-label="On this page">
        <h4>On this page</h4>
        {toc.map(({ id, label }) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <article className="prose legal-body">
        <h1>{title}</h1>
        <p className="muted-small">Last updated {updated}</p>
        {children}
      </article>
    </div>
  );
}