"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function AIProjectIntelligencePanel({ projectId }) {
  const [syncResult, setSyncResult] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [riskData, setRiskData] = useState(null);

  const [syncing, setSyncing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const handleSyncKnowledge = async () => {
    setSyncing(true);
    setError("");

    try {
      const response = await apiRequest(`/rag/projects/${projectId}/sync`, {
        method: "POST"
      });

      setSyncResult(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleAskQuestion = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      setError("Question is required");
      return;
    }

    setAsking(true);
    setError("");

    try {
      const response = await apiRequest(`/rag/projects/${projectId}/ask`, {
        method: "POST",
        body: JSON.stringify({
          question
        })
      });

      setAnswer(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setAsking(false);
    }
  };

  const handleRiskAnalysis = async () => {
    setAnalyzing(true);
    setError("");

    try {
      const response = await apiRequest(`/rag/projects/${projectId}/risk-analysis`);

      setRiskData(response.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getHealthVariant = (score) => {
    if (score >= 80) {
      return "green";
    }

    if (score >= 55) {
      return "orange";
    }

    return "red";
  };

  return (
    <Panel className="mt-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">AI Project Intelligence</h2>
          <p className="text-slate-400 mt-2">
            Sync project knowledge into the RAG pipeline, ask grounded project questions, and generate workload/risk analysis.
          </p>
        </div>

        <Badge variant="blue">RAG powered</Badge>
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <button
          onClick={handleSyncKnowledge}
          disabled={syncing}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
        >
          {syncing ? "Syncing knowledge..." : "Sync project knowledge"}
        </button>

        <button
          onClick={handleRiskAnalysis}
          disabled={analyzing}
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-60"
        >
          {analyzing ? "Analyzing risks..." : "Generate risk analysis"}
        </button>

        <div className="rounded-xl bg-slate-950 border border-slate-800 px-5 py-3">
          <p className="text-sm text-slate-400">Knowledge status</p>
          <p className="font-semibold mt-1">
            {syncResult ? `${syncResult.indexedCount} chunks indexed` : "Not synced yet"}
          </p>
        </div>
      </div>

      {syncResult && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <SmallMetric label="Tasks indexed" value={syncResult.tasksIndexed} />
          <SmallMetric label="Comments indexed" value={syncResult.commentsIndexed} />
          <SmallMetric label="GitHub issues indexed" value={syncResult.githubIssuesIndexed} />
        </div>
      )}

      <section className="mt-8 rounded-xl bg-slate-950 border border-slate-800 p-5">
        <h3 className="text-lg font-bold">Ask Project AI</h3>
        <p className="text-slate-400 mt-2">
          Ask questions like “Who is overloaded?”, “Which tasks are risky?”, or “What should we prioritize next?”
        </p>

        <form onSubmit={handleAskQuestion} className="mt-5 space-y-4">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask something about this project..."
            rows={3}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={asking || !question.trim()}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {asking ? "Thinking..." : "Ask AI"}
          </button>
        </form>

        {!answer ? (
          <EmptyState message="AI answers will appear here after you ask a question." />
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
              <p className="text-sm text-slate-400">Answer</p>
              <p className="text-slate-200 mt-2 whitespace-pre-wrap">{answer.answer}</p>
            </div>

            {answer.suggestedActions?.length > 0 && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <p className="text-sm text-slate-400">Suggested actions</p>

                <ul className="mt-3 space-y-2">
                  {answer.suggestedActions.map((action, index) => (
                    <li key={`${action}-${index}`} className="text-slate-300">
                      {index + 1}. {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {answer.sources?.length > 0 && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <p className="text-sm text-slate-400">Sources used</p>

                <div className="mt-3 space-y-3">
                  {answer.sources.map((source, index) => (
                    <div
                      key={`${source.title}-${index}`}
                      className="rounded-xl bg-slate-950 border border-slate-800 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="blue">{source.sourceType}</Badge>
                      </div>

                      <p className="font-medium mt-3">{source.title}</p>
                      <p className="text-sm text-slate-400 mt-2">{source.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answer.retrievedChunks?.length > 0 && (
              <details className="rounded-xl bg-slate-900 border border-slate-800 p-5">
                <summary className="cursor-pointer font-semibold">
                  Retrieved RAG context
                </summary>

                <div className="mt-4 space-y-3">
                  {answer.retrievedChunks.map((chunk) => (
                    <div
                      key={chunk._id}
                      className="rounded-xl bg-slate-950 border border-slate-800 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge>{chunk.sourceType}</Badge>
                        <Badge variant="blue">
                          Score: {Number(chunk.score || 0).toFixed(3)}
                        </Badge>
                      </div>

                      <p className="font-medium mt-3">{chunk.title}</p>
                      <p className="text-sm text-slate-400 mt-2 line-clamp-4">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-xl bg-slate-950 border border-slate-800 p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Risk analysis</h3>
            <p className="text-slate-400 mt-2">
              AI reviews task metrics, workload, stale tasks, overdue work, comments, and GitHub issue context.
            </p>
          </div>

          {riskData?.analysis && (
            <Badge variant={getHealthVariant(riskData.analysis.healthScore)}>
              Health score: {riskData.analysis.healthScore}/100
            </Badge>
          )}
        </div>

        {!riskData ? (
          <EmptyState message="Generate risk analysis to see project health, risks, and recommendations." />
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
              <p className="text-sm text-slate-400">Summary</p>
              <p className="text-slate-200 mt-2">{riskData.analysis.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SmallMetric label="Total tasks" value={riskData.metrics.totalTasks} />
              <SmallMetric label="Overdue" value={riskData.metrics.overdueTasks} />
              <SmallMetric label="Urgent" value={riskData.metrics.urgentTasks} />
              <SmallMetric label="Unassigned" value={riskData.metrics.unassignedTasks} />
            </div>

            <RiskSection
              title="Risks"
              items={riskData.analysis.risks}
              renderItem={(item) => (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={item.severity === "critical" || item.severity === "high" ? "red" : "orange"}>
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="font-bold mt-3">{item.title}</p>
                  <p className="text-sm text-slate-400 mt-2">{item.evidence}</p>
                  <p className="text-sm text-slate-300 mt-2">
                    Recommendation: {item.recommendation}
                  </p>
                </>
              )}
            />

            <RiskSection
              title="Overloaded members"
              items={riskData.analysis.overloadedMembers}
              renderItem={(item) => (
                <>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-slate-400 mt-2">{item.reason}</p>
                  <p className="text-sm text-slate-300 mt-2">
                    Recommendation: {item.recommendation}
                  </p>
                </>
              )}
            />

            <RiskSection
              title="Blocked or stale tasks"
              items={riskData.analysis.blockedOrStaleTasks}
              renderItem={(item) => (
                <>
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-slate-400 mt-2">{item.reason}</p>
                  <p className="text-sm text-slate-300 mt-2">
                    Recommendation: {item.recommendation}
                  </p>
                </>
              )}
            />

            <ListSection title="Recommendations" items={riskData.analysis.recommendations} />
            <ListSection title="Next best actions" items={riskData.analysis.nextBestActions} />
          </div>
        )}
      </section>
    </Panel>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value ?? 0}</p>
    </div>
  );
}

function RiskSection({ title, items = [], renderItem }) {
  return (
    <div>
      <h4 className="font-bold text-lg">{title}</h4>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">No items found.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-xl bg-slate-900 border border-slate-800 p-5"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListSection({ title, items = [] }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-5">
      <h4 className="font-bold text-lg">{title}</h4>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 mt-3">No items found.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="text-slate-300">
              {index + 1}. {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}