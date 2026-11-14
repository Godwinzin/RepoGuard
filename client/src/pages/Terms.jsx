import { usePageTitle } from "../usePageTitle";
import { SITE } from "../site";

export default function Terms() {
  usePageTitle("Terms of Service");

  return (
    <article className="prose">
      <h1>Terms of Service</h1>
      <p className="muted-small">Last updated {SITE.legalUpdated}</p>

      <p>By using {SITE.name} you agree to these terms. They are short on purpose.</p>

      <h2>The service</h2>
      <p>
        {SITE.name} is free and provided as is. It may change, be interrupted or stop at any time,
        and it runs on free hosting that can be slow to wake up.
      </p>

      <h2>Your account and repositories</h2>
      <p>
        You log in with your own GitHub account, and you may only add repositories you are allowed
        to audit. {SITE.name} works with public repositories only. You are responsible for what you
        add.
      </p>

      <h2>Results are automated</h2>
      <p>
        Audits use automated checks, and some are keyword-based guesses. Results can be wrong or
        incomplete, and a good score is not a guarantee that a project is secure. Check findings
        before acting on them, and do not rely on {SITE.name} as your only protection.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not abuse the service: no overloading it, scraping it, bypassing its rate limits, or
        trying to access data that is not yours. We may limit or suspend access to protect the
        service.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided without warranties of any kind, and to the extent the law allows,
        we are not liable for losses that come from using it. Nothing in these terms limits rights
        you have under the law.
      </p>

      <h2>Open source</h2>
      <p>
        The {SITE.name} source code is available under the MIT License at{" "}
        <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer">
          its GitHub repository
        </a>
        . {SITE.name} is an independent project and is not affiliated with or endorsed by GitHub.
        GitHub is a trademark of GitHub, Inc.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will change the date above when we do. Questions? 
        Email <a href="mailto:${SITE.contactEmail}">{SITE.contactEmail}</a>. See also the <a href="/privacy">Privacy Policy</a>.
      </p>
    </article>
  );
}