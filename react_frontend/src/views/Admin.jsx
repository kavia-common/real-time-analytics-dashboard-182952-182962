import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import { adminAuthFetch } from "../adminAuth.js";
import { authorizedFetch } from "../api.js";

/**
 * PUBLIC_INTERFACE
 * Admin
 * Admin MCQ management page with a modern, responsive 2x2 card layout.
 * - Create MCQ form presented as a card
 * - Questions rendered as cards in a responsive grid (1 col on small, 2 cols on md+, 3 on xl)
 * - Shows option chips with correct option highlight (when derivable), quick stats, and actions
 * - Loading and empty states; subtle animations on create success
 */
export default function Admin() {
  // Form state
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [animateSuccess, setAnimateSuccess] = useState(false);

  // Questions list
  const [loadingList, setLoadingList] = useState(false);
  const [questions, setQuestions] = useState([]);

  // Allow manual refresh
  const [refreshing, setRefreshing] = useState(false);

  // Derived validation
  const isFormValid = useMemo(() => {
    const trimmed = text.trim();
    const optsFilled = options.every((o) => o.trim().length > 0);
    const idxValid =
      Number.isInteger(correctIndex) &&
      correctIndex >= 0 &&
      correctIndex < options.length;
    return trimmed.length > 0 && optsFilled && idxValid;
  }, [text, options, correctIndex]);

  /**
   * Try to derive option counts from the question structure:
   * - Prefer q.optionCounts if provided by backend
   * - Else, if q.answers exists (array of { selectedOptionIndex }), aggregate locally
   * - Otherwise, return null to indicate no aggregate data
   */
  const getOptionCounts = (q) => {
    if (Array.isArray(q?.optionCounts)) return q.optionCounts;
    if (Array.isArray(q?.answers)) {
      const counts = new Array((q.options || []).length).fill(0);
      for (const a of q.answers) {
        const idx =
          typeof a?.selectedOptionIndex === "number" ? a.selectedOptionIndex : -1;
        if (idx >= 0 && idx < counts.length) counts[idx] += 1;
      }
      return counts;
    }
    return null;
  };

  // Fetch questions
  const loadQuestions = async () => {
    setLoadingList(true);
    setError("");
    try {
      const res = await authorizedFetch("/api/questions", { method: "GET" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed to fetch questions: ${res.status}`);
      }
      const data = await res.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load questions");
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const updateOption = (i, val) => {
    setOptions((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const resetForm = () => {
    setText("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        text: text.trim(),
        options: options.map((o, i) => ({
          text: o.trim(),
          key: String.fromCharCode(65 + i),
        })), // A, B, C, D keys
        correctOptionIndex: Number(correctIndex),
      };
      const res = await adminAuthFetch("/api/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed to create question: ${res.status}`);
      }
      await res.json().catch(() => ({}));
      setSuccess("Question created successfully.");
      resetForm();
      // Reload list
      await loadQuestions();
      // Subtle animation pulse for success
      setAnimateSuccess(true);
      window.setTimeout(() => setAnimateSuccess(false), 450);
    } catch (e) {
      setError(e?.message || "Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuestions();
  };

  // Helpers
  const numberFmt = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined);
  };

  const QuestionCard = ({ q }) => {
    const counts = getOptionCounts(q);
    const total = Array.isArray(counts)
      ? counts.reduce((a, b) => a + Number(b || 0), 0)
      : 0;

    return (
      <div className="dash-card dash-card--tight" key={q._id || q.text}>
        <div className="q-head">
          <h4 className="dash-heading q-title" title={q.text}>
            {q.text}
          </h4>
          <div className="q-actions" role="group" aria-label="Question actions">
            <button
              className="btn-icon"
              title="Refresh aggregates"
              onClick={onRefresh}
              aria-label="Refresh"
            >
              ⟳
            </button>
            <a className="btn-icon" href="#!" title="View details" aria-label="View details">
              ⓘ
            </a>
          </div>
        </div>

        <div className="q-options">
          {(q.options || []).map((o, i) => {
            const label = `${String.fromCharCode(65 + i)}. ${o?.text || "-"}`;
            const isCorrect =
              typeof q.correctOptionIndex === "number" &&
              q.correctOptionIndex === i;
            return (
              <span
                className={`option-chip ${isCorrect ? "option-chip--correct" : ""}`}
                key={`${q._id}-opt-${i}`}
                title={isCorrect ? "Correct answer" : undefined}
              >
                {label}
              </span>
            );
          })}
        </div>

        <div className="q-stats">
          {Array.isArray(counts) ? (
            <>
              <span className="stat-pill stat-pill--total" title="Total responses">
                Total: {numberFmt(total)}
              </span>
              {counts.map((c, i) => (
                <span
                  key={`${q._id}-cnt-${i}`}
                  className={`stat-pill ${c > 0 ? "stat-pill--active" : ""}`}
                  title={`Responses for ${String.fromCharCode(65 + i)}`}
                >
                  {String.fromCharCode(65 + i)}: {numberFmt(c)}
                </span>
              ))}
            </>
          ) : (
            <span className="muted">No aggregate data</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Header
        title="Admin: MCQ Management"
        subtitle="Create and review multiple-choice questions"
      />

      {/* Responsive grid container */}
      <section className="grid-dashboard">
        {/* Create MCQ form card: full width on small, half on md+ */}
        <div className={`dash-card md-col-span-2 ${animateSuccess ? "card-pulse" : ""}`}>
          <div className="q-head">
            <h3 className="dash-heading">Create a new MCQ</h3>
            <div className="q-actions">
              <button
                className="btn-icon"
                onClick={() => {
                  resetForm();
                }}
                title="Reset form"
                aria-label="Reset form"
                type="button"
              >
                ↺
              </button>
            </div>
          </div>

          {error ? (
            <div className="auth-error" style={{ marginTop: 8 }} role="alert">
              {String(error)}
            </div>
          ) : null}
          {success ? (
            <div
              role="status"
              aria-live="polite"
              className="inline-toast toast-success"
              style={{ marginTop: 8 }}
            >
              {success}
            </div>
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit} style={{ marginTop: 8 }}>
            <label className="auth-label">
              Question Title
              <input
                type="text"
                className="auth-input"
                placeholder="Enter the question text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </label>

            <div className="options-grid">
              {options.map((opt, i) => (
                <label className="auth-label" key={`opt-${i}`}>
                  Option {String.fromCharCode(65 + i)}
                  <input
                    type="text"
                    className="auth-input"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    required
                  />
                </label>
              ))}
            </div>

            <label className="auth-label">
              Correct Option
              <select
                className="auth-input"
                value={correctIndex}
                onChange={(e) => setCorrectIndex(Number(e.target.value))}
              >
                {options.map((_, i) => (
                  <option key={`idx-${i}`} value={i}>
                    {String.fromCharCode(65 + i)}
                  </option>
                ))}
              </select>
            </label>

            <div className="actions-row">
              <button
                type="submit"
                className={`btn-primary auth-submit ${submitting ? "is-loading" : ""}`}
                disabled={submitting || !isFormValid}
                aria-busy={submitting ? "true" : "false"}
              >
                {submitting ? "Creating…" : "Create Question"}
              </button>
              <button
                type="button"
                className="btn-link"
                onClick={onRefresh}
                disabled={loadingList || refreshing}
                title="Refresh questions"
              >
                {loadingList || refreshing ? "Refreshing…" : "Refresh list"}
              </button>
            </div>
          </form>
        </div>

        {/* Loading/empty states for questions */}
        {loadingList ? (
          <div className="dash-card">
            <div className="skeleton skeleton-text" aria-busy="true">
              Loading questions…
            </div>
          </div>
        ) : null}

        {!loadingList && questions.length === 0 ? (
          <div className="dash-card">
            <div className="empty-state" role="status" aria-live="polite">
              <span className="empty-icon" aria-hidden="true">ⓘ</span>
              <span>No questions yet. Create your first one above.</span>
            </div>
          </div>
        ) : null}

        {/* Questions as cards in responsive grid */}
        {!loadingList &&
          questions.length > 0 &&
          questions.map((q) => <QuestionCard key={q._id || q.text} q={q} />)}
      </section>

      <footer className="footer">
        <span>Ocean Professional Theme</span>
      </footer>
    </div>
  );
}
