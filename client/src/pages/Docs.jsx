import { useLocation } from "react-router-dom";
import { usePageTitle } from "../usePageTitle";
import Inline from "../components/Inline";
import { CATEGORIES, RULES, SEVERITIES } from "../rulesDocs";

export default function Docs() {
  usePageTitle("Docs");
  const { hash } = useLocation();

  return (
    <div className="docs-layout">
      <nav className="docs-toc" aria-label="On this page">
        <h4>Guide</h4>
        <a href="#how-it-works">How it works</a>
        <a href="#scoring">Scoring</a>
        <a href="#comparing">Comparing audits</a>
        <a href="#accepting">Accepting a risk</a>
        <a href="#monitoring">Monitoring</a>
        <a href="#limits">Limits</a>

        {CATEGORIES.map((category) => (
          <div key={category}>
            <h4>{category}</h4>
            {RULES.filter((r) => r.category === category).map((rule) => (
              <a key={rule.id} href={`#${rule.id}`}>
                {rule.title}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="docs-body">
        <h1>Documentation</h1>
        <p className="subtitle">How RepoGuard audits a repository, and what every check means.</p>

        <h2 id="how-it-works">How it works</h2>
        <p>
          RepoGuard reads the file list of your repository's default branch through the GitHub API
          and runs every check against it. Repositories are never cloned and no code is ever run.
          File contents are only fetched when a check needs them. Audits run in the background and
          the report appears when they finish. An audit that takes longer than two minutes is
          stopped.
        </p>

        <h2 id="scoring">Scoring</h2>
        <p>
          The score starts at 100 and loses points for every open problem. It never goes below 0.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Points lost</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {SEVERITIES.map((s) => (
                <tr key={s.key}>
                  <td>
                    <span className={`sev sev-${s.key}`}>{s.key}</span>
                  </td>
                  <td>{s.points}</td>
                  <td className="wrap">{s.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>80 or more is shown in green, 50 to 79 in amber, and below 50 in red.</p>

        <h2 id="comparing">Comparing audits</h2>
        <p>
          Every problem has a fingerprint built from the check, the file and, where it applies,
          the package or secret involved. Comparing two audits by fingerprint tells RepoGuard what
          is new, what is still open and what has been fixed. That is how the report can say "3 new
          problems, 2 fixed" and how monitoring knows when to notify you.
        </p>

        <h2 id="accepting">Accepting a risk</h2>
        <p>
          If you have decided to live with a problem, you can accept it on the repository's latest
          report. Accepted problems stay visible in their own section, stop counting against the
          score and do not trigger notifications. Critical and high problems need a written
          reason, so the decision still makes sense later. If the problem changes (for example, a
          package is upgraded to a different vulnerable version), it counts as a new problem.
        </p>

        <h2 id="monitoring">Monitoring</h2>
        <p>
          Turn monitoring on for a repository you own and RepoGuard adds a webhook to it. After
          that, every push to the default branch starts an audit, and you get a notification if
          it finds something new. Turning monitoring off removes the webhook. Creating a webhook
          needs admin access to the repository.
        </p>

        <h2 id="limits">Limits</h2>
        <ul>
          <li>Public repositories only.</li>
          <li>JavaScript and Node projects only.</li>
          <li>The vulnerability scan reads npm lockfiles (npm 7 and newer).</li>
          <li>Only the default branch is audited.</li>
          <li>
            The secret scan covers current files, not Git history, and at most 150 files per
            audit.
          </li>
          <li>Several checks are keyword-based heuristics, so they can occasionally be wrong.</li>
        </ul>

        <h2>Checks</h2>
        <p>Each finding links here. Select one in the list to jump to it.</p>

        {CATEGORIES.map((category) => (
          <div key={category}>
            <h3 className="docs-category">{category}</h3>

            {RULES.filter((r) => r.category === category).map((rule) => (
              <section
                key={rule.id}
                id={rule.id}
                className={`doc-rule ${hash === `#${rule.id}` ? "doc-rule-active" : ""}`}
              >
                <div className="doc-rule-head">
                  <h4 className="doc-rule-title">{rule.title}</h4>
                  <span className={`sev sev-${rule.tone}`}>{rule.level}</span>
                </div>
                <p className="muted-small">
                  <code>{rule.id}</code>
                </p>

                <h5>What it checks</h5>
                <p>
                  <Inline text={rule.what} />
                </p>
                <h5>Why it matters</h5>
                <p>
                  <Inline text={rule.why} />
                </p>
                <h5>How to fix it</h5>
                <p>
                  <Inline text={rule.fix} />
                </p>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}