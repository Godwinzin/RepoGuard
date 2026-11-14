import { usePageTitle } from "../usePageTitle";
import { SITE } from "../site";

export default function Privacy() {
  usePageTitle("Privacy Policy");

  return (
    <article className="prose">
      <h1>Privacy Policy</h1>
      <p className="muted-small">Last updated {SITE.legalUpdated}</p>

      <p>
        {SITE.name} audits public GitHub repositories. This page explains, in
        plain language, what it stores, who else sees data, and how to remove
        it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>From your GitHub account:</strong> your GitHub user ID,
          username, display name, avatar address and public email address (if
          you have one).
        </li>
        <li>
          <strong>A GitHub access token,</strong> encrypted before it is stored.
          We request permission to read your profile and to manage repository
          webhooks (used only if you turn on monitoring). It does not give{" "}
          {SITE.name} access to your private repositories.
        </li>
        <li>
          <strong>Repositories you add:</strong> their name, default branch and
          GitHub's ID for them.
        </li>
        <li>
          <strong>Audit results:</strong> scores, commit identifiers and
          findings (the check, title, severity, file path and line number).
        </li>
        <li>
          <strong>Secrets are never stored.</strong> When an audit finds one, we
          keep where it is, never what it is. A short keyed fingerprint lets us
          recognise the same secret in the next audit.
        </li>
        <li>
          <strong>What you write:</strong> the reasons you give when accepting a
          risk.
        </li>
        <li>
          <strong>Notifications, AI drafts and webhook records</strong>{" "}
          (delivery ID, event type, branch and commit).
        </li>
      </ul>

      <h2>Cookies and logs</h2>
      <ul>
        <li>
          One cookie, <code>repoguard.sid</code>, keeps you logged in for up to
          7 days. It is essential for the service, which is why there is no
          cookie banner. {SITE.name} does not use analytics or advertising
          cookies.
        </li>
        <li>
          Our server logs record the request method, path, status, duration and
          your user ID. They do not record query strings, IP addresses or
          request bodies. Login attempts are counted per IP address in memory
          for a short time, to prevent abuse.
        </li>
      </ul>

      <h2>Who else sees data</h2>
      <ul>
        <li>
          <strong>GitHub</strong> handles your login, and we read file lists and
          file contents of the repositories you audit through its API.
        </li>
        <li>
          <strong>OSV.dev and the npm registry</strong> receive package names
          and versions from your lockfile, to look up vulnerabilities and latest
          versions.
        </li>
        <li>
          <strong>Groq (an AI provider)</strong> receives data only when you
          click Generate on a report: variable names, dependency names, script
          names (with inline values removed), folder and file names, and the
          project name and description, after a check for secret-like text. No
          source code and no secret values are sent.
        </li>
        <li>
          <strong>Vercel, Render and Neon</strong> host the website, the server
          and the database. They process the data above to run the service, and
          they also see technical data such as IP addresses.
        </li>
      </ul>
      <p>We do not sell data and we do not show ads.</p>

      <h2>Security</h2>
      <p>
        Tokens are encrypted at rest. Connections use HTTPS, sessions are stored
        on the server, and the session cookie cannot be read by page scripts.
        Webhooks from GitHub are verified with a signature. No system is
        perfectly secure, so please use the minimum access you are comfortable
        with.
      </p>

      <h2>How long we keep data, and how to remove it</h2>
      <ul>
        <li>
          <strong>Delete your account yourself:</strong> open Settings from your
          avatar menu and choose Delete my account. It removes your profile,
          repositories, audits, findings, accepted risks, AI drafts,
          notifications and login sessions from our database. It also removes
          the webhooks we created on your repositories and revokes {SITE.name}'s
          access to your GitHub account. It cannot be undone, and your
          repositories on GitHub are never touched.
        </li>
        <li>
          <strong>Remove a single repository</strong> in the app, and its
          audits, findings, accepted risks, AI drafts and webhook are deleted.
        </li>
        <li>
          <strong>Revoke access</strong> at any time in GitHub: Settings,
          Applications, Authorized OAuth Apps, {SITE.name}, Revoke.
        </li>
        <li>
          <strong>What can remain after deletion:</strong> server logs and
          backups that our hosting providers keep for a limited period, and
          job-queue records that contain only numeric IDs.
        </li>
        <li>
          Sessions expire after 7 days. There is no automatic deletion for
          inactive accounts yet.
        </li>
      </ul>

      <h2>Changes and questions</h2>
      <p>
        If we change what we collect or share, we will update this page and its
        date. For questions or requests, email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </article>
  );
}
