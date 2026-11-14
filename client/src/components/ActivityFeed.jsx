import { Link } from "react-router-dom";
import { AlertIcon, CheckCircleIcon, XCircleIcon } from "./icons";
import { splitName, timeAgo } from "../format";

function describe(item) {
  if (item.status === "failed") {
    return { tone: "bad", Icon: XCircleIcon, title: "Audit failed", tail: "Failed" };
  }
  if (item.critical > 0) {
    return {
      tone: "bad",
      Icon: AlertIcon,
      title: `${item.critical} critical ${item.critical === 1 ? "issue" : "issues"} found`,
      tail: `${item.score}/100`,
    };
  }
  if (item.problems > 0) {
    return {
      tone: "warn",
      Icon: AlertIcon,
      title: `${item.problems} ${item.problems === 1 ? "problem" : "problems"} found`,
      tail: `${item.score}/100`,
    };
  }
  return { tone: "good", Icon: CheckCircleIcon, title: "Audit completed", tail: `${item.score}/100` };
}

export default function ActivityFeed({ items }) {
  if (items.length === 0) {
    return <p className="muted-small">No audits yet. Run one and it will show up here.</p>;
  }

  return (
    <ul className="feed">
      {items.map((item) => {
        const { tone, Icon, title, tail } = describe(item);
        const { name } = splitName(item.full_name);

        return (
          <li key={item.id}>
            <Link to={`/audits/${item.id}`} className="feed-item">
              <span className={`feed-icon feed-icon-${tone}`}>
                <Icon size={16} />
              </span>
              <span className="feed-main">
                <span className="feed-title">{title}</span>
                <span className="feed-sub">
                  {name} · {item.triggered_by === "push" ? "push · " : ""}
                  {timeAgo(item.finished_at ?? item.created_at)}
                </span>
              </span>
              <span className={`feed-tail feed-tail-${tone}`}>{tail}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}