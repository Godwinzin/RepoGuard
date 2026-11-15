import { useState } from "react";
import { useLocation } from "react-router-dom";
import { usePageTitle } from "../usePageTitle";
import Inline from "../components/Inline";
import { CATEGORIES, RULES, SEVERITIES } from "../rulesDocs";
import {
  AlertIcon,
  BookIcon,
  FileTextIcon,
  FolderIcon,
  GaugeIcon,
  KeyIcon,
  PackageIcon,
  SearchIcon,
  ShieldIcon,
} from "../components/icons";

const CATEGORY_ICONS = {
  Security: KeyIcon,
  Dependencies: PackageIcon,
  Documentation: FileTextIcon,
  Structure: FolderIcon,
  Quality: GaugeIcon,
  Notices: AlertIcon,
};

const STEPS = [
  { title: "Connect", text: "Log in with GitHub and add one of your public repositories." },
  {
    title: "Read",
    text: "RepoGuard reads the file list of the default branch. Nothing is cloned and no code runs.",
  },
  { title: "Check", text: "Every check runs in the background. The report appears when they finish." },
  { title: "Fix", text: "Each problem explains why it matters and exactly how to fix it." },
];

export default function Docs() {
  usePageTitle("Docs");
  const { hash } = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const needle = query.trim().toLowerCase();
  const visible = RULES.filter((rule) => {
    if (category !== "All" && rule.category !== category) return false;
    if (!needle) return true;
    return `${rule.title} ${rule.id} ${rule.what} ${rule.why} ${rule.fix}`
      .toLowerCase()
      .includes(needle);
  });

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

        <h4>Checks</h4>
        {CATEGORIES.map((name) => (
          <a key={name} href={`#category-${name}`}>
            {name}
          </a>
        ))}
      </nav>

      <div className="docs-body">
        <header className="docs-hero">
          <span className="docs-hero-icon">
            <BookIcon size={22} />
          </span>
          <h1>Documentation</h1>
          <p>How RepoGuard audits a repository, and what every check means.</p>

          <div className="quick-grid">
            <a href="#how-it-works" className="quick-card">
              <span className="stat-icon stat-icon-blue">
                <ShieldIcon size={20} />
              </span>
              <strong>How it works</strong>
              <span>From connecting GitHub to reading a report.</span>
            </a>
            <a href="#scoring" className="quick-card">
              <span className="stat-icon stat-icon-good">
                <GaugeIcon size={20} />
              </span>
              <strong>Scoring</strong>
              <span>What each severity costs, and what the colours mean.</span>
            </a>
            <a href="#checks" className="quick-card">
              <span className="stat-icon stat-icon-warn">
                <KeyIcon size={20} />
              </span>
              <strong>{RULES.length} checks</strong>
              <span>What each one looks for and how to fix it.</span>
            </a>
          </div>
        </header>

        <h2 id="how-it-works">How it works</h2>
        <div className="steps">
          {STEPS.map((step, index) => (
            <div key={step.title} className="panel step">
              <span className="step-num">{index + 1}</span>
              <h3>{step.title}</h3>
              <p className="muted-small">{step.text}</p>
            </div>
          ))}
        </div>
        <p>
          An audit that takes longer than two minutes is stopped, and the report says so. Audits
          run in the background, so you can leave the page and come back.
        </p>

        <h2 id="scoring">Scoring</h2>
        <p>The score starts at 100 and loses points for every open problem. It never goes below 0.</p>
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
        <div className="bands">
          <span className="score score-good">80 to 100: healthy</span>
          <span className="score score-ok">50 to 79: needs attention</span>
          <span className="score score-bad">below 50: at risk</span>
        </div>

        <h2 id="comparing">Comparing audits</h2>
        <p>
          Every problem has a fingerprint built from the check, the file and, where it applies, the
          package or secret involved. Comparing two audits by fingerprint tells RepoGuard what is
          new, what is still open and what has been fixed. That is how a report can say "3 new
          problems, 2 fixed" and how monitoring knows when to notify you.
        </p>

        <h2 id="accepting">Accepting a risk</h2>
        <p>
          If you have decided to live with a problem, accept it on the repository's latest report.
          Accepted problems stay visible in their own section, stop counting against the score and
          do not trigger notifications. Critical and high problems need a written reason, so the
          decision still makes sense later. If the problem changes (for example, a package is
          upgraded to a different vulnerable version), it counts as a new problem.
        </p>

        <h2 id="monitoring">Monitoring</h2>
        <p>
          Turn monitoring on for a repository you own and RepoGuard adds a webhook to it. After
          that, every push to the default branch starts an audit, and you get a notification if it
          finds something new. Turning monitoring off removes the webhook. Creating a webhook needs
          admin access to the repository.
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

        <h2 id="checks">Checks</h2>
        <p>Each finding in a report links here. Search, or filter by category.</p>

        <div className="search">
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder="Search the checks…"
            aria-label="Search the checks"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filters">
          {["All", ...CATEGORIES].map((name) => (
            <button
              key={name}
              type="button"
              className={`filter-chip ${category === name ? "filter-chip-active" : ""}`}
              onClick={() => setCategory(name)}
              aria-pressed={category === name}
            >
              {name}
            </button>
          ))}
        </div>

        <p className="muted-small">
          Showing {visible.length} of {RULES.length} checks.
        </p>

        {visible.length === 0 && (
          <div className="state-box">
            <h2>No checks match</h2>
            <p>Try a different word, or choose All.</p>
          </div>
        )}

        {CATEGORIES.map((name) => {
          const rules = visible.filter((r) => r.category === name);
          if (rules.length === 0) return null;
          const Icon = CATEGORY_ICONS[name];

          return (
            <div key={name}>
              <h3 id={`category-${name}`} className="docs-category">
                {name}
              </h3>

              {rules.map((rule) => (
                <section
                  key={rule.id}
                  id={rule.id}
                  className={`doc-rule doc-rule-${rule.tone} ${
                    hash === `#${rule.id}` ? "doc-rule-active" : ""
                  }`}
                >
                  <div className="doc-rule-head">
                    <span className="doc-rule-icon">
                      <Icon size={18} />
                    </span>
                    <div className="doc-rule-titles">
                      <h4 className="doc-rule-title">{rule.title}</h4>
                      <code>{rule.id}</code>
                    </div>
                    <span className={`sev sev-${rule.tone}`}>{rule.level}</span>
                  </div>

                  <p className="doc-what">
                    <Inline text={rule.what} />
                  </p>

                  <div className="doc-cols">
                    <div>
                      <h5>Why it matters</h5>
                      <p>
                        <Inline text={rule.why} />
                      </p>
                    </div>
                    <div className="doc-fix">
                      <h5>How to fix it</h5>
                      <p>
                        <Inline text={rule.fix} />
                      </p>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}