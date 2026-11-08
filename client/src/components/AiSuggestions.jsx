import { useState } from "react";
import { api } from "../api";
import { useRecommendations } from "../useRecommendations";
import { useToast } from "../toast/useToast";
import Button from "./Button";
import { Skeleton } from "./Skeleton";

const TYPES = [
  {
    type: "env_example",
    title: "Suggested .env.example",
    description:
      "Lists the environment variables your code uses, with safe placeholder values.",
  },
  {
    type: "readme",
    title: "README draft",
    description:
      "A starting point built from your package.json and folder structure.",
  },
];

export default function AiSuggestions({ auditId }) {
  const { data, loading, error, put, retry } = useRecommendations(auditId);
  const [starting, setStarting] = useState(null);
  const toast = useToast();

  async function generate(type) {
    setStarting(type);

    try {
      const created = await api(`/audits/${auditId}/recommendations`, {
        method: "POST",
        body: { type },
      });
      put(created);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStarting(null);
    }
  }

  async function copy(content) {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error(
        "Couldn't copy automatically. Select the text and copy it manually.",
      );
    }
  }

  return (
    <section>
      <h3 className="section-title">AI suggestions</h3>
      <p className="muted-small mb">
        Drafts generated from your project's file names, scripts and variable
        names. No source code and no secret values are sent to the AI. Always
        review a draft before using it.
      </p>

      {loading ? (
        <Skeleton height={150} radius="14px" />
      ) : error ? (
        <div className="state-box">
          <p>{error.message}</p>
          <div className="state-actions">
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        <div className="ai-grid">
          {TYPES.map(({ type, title, description }) => {
            const rec = data.find((r) => r.type === type);
            const working =
              rec?.status === "queued" || rec?.status === "running";

            return (
              <div key={type} className="panel ai-card">
                <div className="ai-card-head">
                  <div>
                    <h4>{title}</h4>
                    <p className="muted-small">{description}</p>
                  </div>

                  {(!rec || rec.status === "failed") && (
                    <Button
                      size="sm"
                      onClick={() => generate(type)}
                      loading={starting === type}
                      disabled={starting !== null}
                    >
                      {rec?.status === "failed" ? "Try again" : "Generate"}
                    </Button>
                  )}
                </div>

                {working && (
                  <div className="ai-working">
                    <span className="spinner" />
                    <span className="muted-small">
                      Generating… this usually takes a few seconds.
                    </span>
                  </div>
                )}

                {rec?.status === "failed" && (
                  <p className="ai-error">
                    {rec.error_message ??
                      "We couldn't generate this. Please try again."}
                  </p>
                )}

                {rec?.status === "done" && (
                  <>
                    {/* Plain text on purpose: the content came from an AI, so we never render it as HTML */}
                    <pre className="code-block">
                      <code>{rec.content}</code>
                    </pre>
                    <div className="ai-card-foot">
                      <span className="muted-small">
                        AI-generated draft
                      </span>
                      <div className="actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generate(type)}
                          loading={starting === type}
                          disabled={starting !== null}
                        >
                          Regenerate
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => copy(rec.content)}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
