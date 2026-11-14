import { Link } from "react-router-dom";
import { usePageTitle } from "../usePageTitle";
import GitHubLoginButton from "../components/GitHubLoginButton";
import ScoreRing from "../components/ScoreRing";
import FindingCard from "../components/FindingCard";
import {
  BellIcon,
  FileTextIcon,
  GaugeIcon,
  KeyIcon,
  LockIcon,
  PackageIcon,
  SparklesIcon,
} from "../components/icons";

const STEPS = [
  {
    title: "Connect GitHub",
    text: "Sign in with GitHub. RepoGuard never sees your password and only reads public repositories.",
  },
  {
    title: "Pick a repository",
    text: "Choose one of your public repositories. Nothing is cloned and no code is ever run.",
  },
  {
    title: "Read your report",
    text: "Get a health score, every problem explained in plain English, and exactly how to fix it.",
  },
];

const FEATURES = [
  {
    icon: KeyIcon,
    title: "Secret scanning",
    text: "Finds committed .env files, cloud keys, tokens and passwords, and never stores the secret itself.",
  },
  {
    icon: PackageIcon,
    title: "Dependency checks",
    text: "Flags known vulnerabilities and packages that are a major version behind.",
  },
  {
    icon: FileTextIcon,
    title: "Docs and structure",
    text: "Checks your README, .gitignore, license, tests, lockfile and CI setup.",
  },
  {
    icon: BellIcon,
    title: "Push monitoring",
    text: "Re-audits on every push and tells you when something new appears.",
  },
  {
    icon: GaugeIcon,
    title: "Score and history",
    text: "See what is new, what is fixed and how your score changes over time.",
  },
  {
    icon: SparklesIcon,
    title: "AI-drafted files",
    text: "Generate a .env.example and a README draft from names and structure only.",
  },
];

// A made-up example so visitors can see what a report looks like
const SAMPLE_FINDINGS = [
  {
    rule_id: "env-committed",
    severity: "critical",
    title: "Environment file committed to the repository",
    message:
      "Environment files usually contain passwords and API keys. Anyone who can see this repository can read them, and they stay in the Git history even after you delete the file.",
    fix: "Run `git rm --cached <file>`, add it to .gitignore, and rotate every secret that was inside it.",
    file_path: "server/.env",
    fingerprint: "sample-1",
    accepted: false,
    change: "new",
  },
  {
    rule_id: "license-missing",
    severity: "low",
    title: "No license file",
    message:
      "Without a license, the default is all rights reserved. Others have no legal permission to reuse or modify your code, even if the repository is public.",
    fix: "Add a LICENSE file. MIT is a common permissive choice.",
    file_path: "LICENSE",
    fingerprint: "sample-2",
    accepted: false,
    change: null,
  },
];

export default function Landing() {
  usePageTitle("Audit your GitHub repositories");

  return (
    <>
      <section className="hero">
        <h1>Know what's wrong with your repo before anyone else does.</h1>
        <p className="lead">
          Connect GitHub and get an instant health report for your projects, with a plain-English
          explanation of every problem and how to fix it.
        </p>

        <div className="hero-actions">
          <GitHubLoginButton />
          <Link to="/docs" className="btn btn-secondary btn-lg">
            See what it checks
          </Link>
        </div>
        <p className="fine-print">Free. Public repositories only. Your code is never cloned or run.</p>

        <div className="panel sample" aria-label="Example report">
          <div className="sample-head">
            <div>
              <span className="repo-owner">your-name</span>
              <h2>your-project</h2>
              <p className="muted-small">Example report</p>
            </div>
            <ScoreRing score={72} size={84} />
          </div>

          {SAMPLE_FINDINGS.map((finding) => (
            <FindingCard key={finding.fingerprint} finding={finding} />
          ))}
        </div>
      </section>

      <h2 className="section-heading">How it works</h2>
      <div className="steps">
        {STEPS.map((step, index) => (
          <div key={step.title} className="panel step">
            <span className="step-num">{index + 1}</span>
            <h3>{step.title}</h3>
            <p className="muted-small">{step.text}</p>
          </div>
        ))}
      </div>

      <h2 className="section-heading">What it checks</h2>
      <div className="feature-grid">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="panel feature">
            <span className="stat-icon stat-icon-blue">
              <Icon size={20} />
            </span>
            <h3>{title}</h3>
            <p className="muted-small">{text}</p>
          </div>
        ))}
      </div>

      <section className="panel band">
        <span className="stat-icon stat-icon-good band-icon">
          <LockIcon size={20} />
        </span>
        <h2>Built with your privacy in mind</h2>
        <ul className="band-list">
          <li>GitHub tokens are encrypted before they are stored.</li>
          <li>Secrets that RepoGuard finds are reported, but their values are never saved.</li>
          <li>The AI only sees names and structure, never source code or secret values.</li>
          <li>No analytics, no ads.</li>
        </ul>
        <div className="hero-actions">
          <GitHubLoginButton />
          <Link to="/privacy" className="btn btn-secondary btn-lg">
            Read the privacy policy
          </Link>
        </div>
      </section>
    </>
  );
}