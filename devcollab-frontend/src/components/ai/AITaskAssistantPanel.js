"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function AITaskAssistantPanel({ projectId, onTasksCreated }) {
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState([]);

  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async (event) => {
    event.preventDefault();
    setGenerating(true);
    setError("");
    setSummary("");
    setSuggestions([]);
    setSelectedIndexes([]);

    try {
      const response = await apiRequest(`/ai/projects/${projectId}/task-suggestions`, {
        method: "POST",
        body: JSON.stringify({
          transcript
        })
      });

      const generatedSuggestions = response.data.suggestions || [];

      setSummary(response.data.summary || "");
      setSuggestions(generatedSuggestions);
      setSelectedIndexes(generatedSuggestions.map((_, index) => index));
    } catch (error) {
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSuggestion = (index) => {
    setSelectedIndexes((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );
  };

  const handleSuggestionChange = (index, field, value) => {
    setSuggestions((previous) =>
      previous.map((suggestion, currentIndex) =>
        currentIndex === index
          ? {
              ...suggestion,
              [field]: value
            }
          : suggestion
      )
    );
  };

  const handleLabelsChange = (index, value) => {
    setSuggestions((previous) =>
      previous.map((suggestion, currentIndex) =>
        currentIndex === index
          ? {
              ...suggestion,
              labels: value
                .split(",")
                .map((label) => label.trim())
                .filter(Boolean)
            }
          : suggestion
      )
    );
  };

  const handleCreateSelectedTasks = async () => {
    const selectedTasks = suggestions.filter((_, index) => selectedIndexes.includes(index));

    if (selectedTasks.length === 0) {
      setError("Select at least one task to create");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await apiRequest(`/ai/projects/${projectId}/create-tasks`, {
        method: "POST",
        body: JSON.stringify({
          tasks: selectedTasks
        })
      });

      setTranscript("");
      setSummary("");
      setSuggestions([]);
      setSelectedIndexes([]);

      if (onTasksCreated) {
        await onTasksCreated();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Panel className="mt-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">AI Meeting Assistant</h2>
          <p className="text-slate-400 mt-2">
            Paste meeting notes or a transcript. AI will suggest tasks, priorities, labels, due dates, and assignees.
          </p>
        </div>

        <Badge variant="blue">AI powered</Badge>
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleGenerate} className="mt-6 space-y-4">
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          placeholder="Paste meeting transcript here..."
          rows={8}
          className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          required
        />

        <button
          type="submit"
          disabled={generating || transcript.trim().length < 30}
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
        >
          {generating ? "Generating suggestions..." : "Generate task suggestions"}
        </button>
      </form>

      {summary && (
        <div className="mt-6 rounded-xl bg-slate-950 border border-slate-800 p-5">
          <p className="text-sm text-slate-400">Meeting summary</p>
          <p className="text-slate-200 mt-2">{summary}</p>
        </div>
      )}

      {suggestions.length === 0 ? (
        <EmptyState message="AI suggestions will appear here after generation." />
      ) : (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Suggested tasks</h3>
              <p className="text-slate-400 mt-1">
                Review and edit before creating tasks.
              </p>
            </div>

            <button
              onClick={handleCreateSelectedTasks}
              disabled={creating || selectedIndexes.length === 0}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-60"
            >
              {creating ? "Creating tasks..." : `Create selected (${selectedIndexes.length})`}
            </button>
          </div>

          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.title}-${index}`}
              className={
                selectedIndexes.includes(index)
                  ? "rounded-xl border border-blue-500/40 bg-blue-500/5 p-5"
                  : "rounded-xl border border-slate-800 bg-slate-950 p-5"
              }
            >
              <div className="flex items-start justify-between gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIndexes.includes(index)}
                    onChange={() => handleToggleSuggestion(index)}
                    className="h-4 w-4"
                  />

                  <span className="font-bold">Task {index + 1}</span>
                </label>

                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge variant="orange">{suggestion.priority}</Badge>
                  <Badge variant="blue">{suggestion.status}</Badge>
                  <Badge>{Math.round((suggestion.confidence || 0) * 100)}% confidence</Badge>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <input
                  value={suggestion.title}
                  onChange={(event) =>
                    handleSuggestionChange(index, "title", event.target.value)
                  }
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />

                <textarea
                  value={suggestion.description}
                  onChange={(event) =>
                    handleSuggestionChange(index, "description", event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select
                    value={suggestion.priority}
                    onChange={(event) =>
                      handleSuggestionChange(index, "priority", event.target.value)
                    }
                    className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <select
                    value={suggestion.status}
                    onChange={(event) =>
                      handleSuggestionChange(index, "status", event.target.value)
                    }
                    className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">Todo</option>
                    <option value="in-progress">In progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                  </select>

                  <input
                    type="date"
                    value={suggestion.dueDate || ""}
                    onChange={(event) =>
                      handleSuggestionChange(index, "dueDate", event.target.value || null)
                    }
                    className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <input
                    value={suggestion.suggestedAssigneeName || "Unassigned"}
                    disabled
                    className="rounded-xl bg-slate-900 border border-slate-800 px-4 py-3 text-slate-400"
                  />
                </div>

                <input
                  value={(suggestion.labels || []).join(", ")}
                  onChange={(event) => handleLabelsChange(index, event.target.value)}
                  placeholder="labels"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-sm text-slate-400">Why this suggestion?</p>
                  <p className="text-slate-300 mt-2">{suggestion.rationale}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}