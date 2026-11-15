import ScoreRing from "./ScoreRing";
import SeverityBadge from "./SeverityBadge";
import RepoAvatar from "./RepoAvatar";
import { CheckCircleIcon, EyeIcon, KeyIcon } from "./icons";

export default function ProductArt() {
  return (
    <div className="art" aria-hidden="true">
      <div className="art-card art-report">
        <div className="art-report-head">
          <RepoAvatar name="your-project" size={34} />
          <div>
            <strong>your-project</strong>
            <span>main · audited just now</span>
          </div>
        </div>
        <div className="art-report-body">
          <ScoreRing score={86} size={72} />
          <ul className="art-stats">
            <li>
              <b>2</b> open problems
            </li>
            <li>
              <b>0</b> critical
            </li>
            <li>
              <b>3</b> fixed this week
            </li>
          </ul>
        </div>
      </div>

      <div className="art-card art-finding">
        <div className="art-row">
          <SeverityBadge severity="critical" />
          <strong>Environment file committed</strong>
        </div>
        <code>server/.env</code>
        <p>Anyone who can see this repository can read the passwords inside it.</p>
      </div>

      <div className="art-card art-code">
        <div className="art-code-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="art-lines">
          <div>
            <span className="art-dim">1</span>PORT=4000
          </div>
          <div>
            <span className="art-dim">2</span>DATABASE_URL=<span className="art-redact" />
          </div>
          <div className="art-hit">
            <span className="art-dim">3</span>JWT_SECRET=<span className="art-redact" />
          </div>
        </div>
        <div className="art-tag">
          <KeyIcon size={14} /> Secret found on line 3
        </div>
      </div>

      <div className="art-pill art-pill-good">
        <CheckCircleIcon size={16} /> 2 problems fixed
      </div>
      <div className="art-pill art-pill-blue">
        <EyeIcon size={16} /> Monitoring on
      </div>
    </div>
  );
}