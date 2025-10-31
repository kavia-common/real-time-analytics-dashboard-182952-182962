import React, { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import { authFetch } from "../auth.js";

/**
 * PUBLIC_INTERFACE
 * Admin
 * Admin MCQ management page.
 * - Shows a form to create a new MCQ (title/text, 4 options, correct option index)
 * - Lists existing questions from GET /api/questions
 * - Displays basic aggregate counts by option for each question if backend returns per-option counts
 */
export default function Admin() {
  // Form state
  const [text, setText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Questions list
  const [loadingList, setLoadingList] = useState(false);
  const [questions, setQuestions] = useState([]);

  const isFormValid = useMemo(() => {
    const trimmed = text.trim();
    const optsFilled = options.every((o) => o.trim().length > 0);
    const idxValid = Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length;
    return trimmed.length > 0 && optsFilled && idxValid;
  }, [text, options, correctIndex]);

  // Fetch questions
  const loadQuestions = async () => {
    setLoadingList(true);
    setError("");
    try {
      const res = await authFetch("/api/questions", { method: "GET" });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed to fetch questions: ${res.status}`);
      }
      const data = await res.json();
      // Expect array of { _id, text, options: [{text,key}], ... } (public, no correct index)
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load questions");
    } finally {
      setLoadingList(false);
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
      // Backend schema expects: { text, options: [{text, key?}], correctOptionIndex, difficulty?, tags? }
      const payload = {
        text: text.trim(),
        options: options.map((o, i) => ({ text: o.trim(), key: String.fromCharCode(65 + i) })), // A, B, C, D
        correctOptionIndex: Number(correctIndex),
      };
      const res = await authFetch("/api/questions", {
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
      loadQuestions();
    } catch (e) {
      setError(e?.message || "Failed to create question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <Header title="Admin: MCQ Management" subtitle="Create and review multiple-choice questions" />

      <section className="card">
        <h3 className="section-title">Create a new MCQ</h3>
        {error ? <div className="auth-error" style={{ marginTop: 8 }}>{String(error)}</div> : null}
        {success ? (
          <div
            style={{
              background: "rgba(245,158,11,0.10)",
              color: "#b45309",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 10,
              padding: "8px 10px",
              marginTop: 8,
              fontSize: 14,
            }}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
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

          <button type="submit" className="btn-primary auth-submit" disabled={submitting || !isFormValid}>
            {submitting ? "Creating…" : "Create Question"}
          </button>
        </form>
      </section>

      <section className="card">
        <h3 className="section-title">Existing Questions</h3>
        {loadingList ? <div className="muted">Loading questions…</div> : null}
        {!loadingList && questions.length === 0 ? (
          <div className="muted">No questions yet.</div>
        ) : null}
        {!loadingList && questions.length > 0 ? (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Question</th>
                  <th>Options</th>
                  <th>Aggregates</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q._id || q.text}>
                    <td>{q.text}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(q.options || []).map((o, i) => (
                          <span key={`${q._id}-opt-${i}`} className="pill">
                            {String.fromCharCode(65 + i)}. {o?.text || "-"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {/* Basic aggregate placeholder: if backend adds counts like q.optionCounts = [n0,n1,n2,n3] */}
                      {Array.isArray(q.optionCounts) ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {q.optionCounts.map((count, i) => (
                            <span key={`${q._id}-cnt-${i}`} className="pill pill-view">
                              {String.fromCharCode(65 + i)}: {count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">No aggregate data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <footer className="footer">
        <span>Ocean Professional Theme</span>
      </footer>
    </div>
  );
}
