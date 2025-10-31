import React, { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Header from "../components/Header.jsx";
import { getQuestions, submitAnswer, getSocketUrl } from "../api.js";
import { getStoredUser } from "../auth.js";
import { io } from "socket.io-client";

/**
 * PUBLIC_INTERFACE
 * Questions
 * Authenticated user MCQ answering page:
 * - Fetches questions from GET /api/questions
 * - Allows selecting an option and submitting via POST /api/answers
 * - After submitting, shows a donut chart of response distribution
 * - Subscribes to Socket.io ("new_answer" or "metrics_update") to update in real time
 */
export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState({}); // { [question_id]: index }
  const [submitting, setSubmitting] = useState({}); // { [question_id]: boolean }
  const [submitted, setSubmitted] = useState({}); // { [question_id]: boolean }
  const [counts, setCounts] = useState({}); // { [question_id]: number[] }
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: string }
  const socketRef = useRef(null);

  // Fetch questions
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        const data = await getQuestions();
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setQuestions(list);
        // Initialize counts if backend embeds, else leave undefined and wait for socket/submit echoes
        const initialCounts = {};
        for (const q of list) {
          if (Array.isArray(q.optionCounts)) initialCounts[q._id || q.id || q.text] = q.optionCounts;
        }
        setCounts((prev) => ({ ...initialCounts, ...prev }));
      } catch (e) {
        if (active) setLoadError(e?.message || "Failed to load questions");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Connect Socket.io for real-time updates
  useEffect(() => {
    const socketURL = getSocketUrl();
    try {
      const s = io(socketURL, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
      socketRef.current = s;

      // 'new_answer' payload shape expected: { question_id, selectedOptionIndex, ... }
      s.on("new_answer", (payload) => {
        if (!payload || !payload.question_id || typeof payload.selectedOptionIndex !== "number") return;
        const qid = payload.question_id;
        setCounts((prev) => {
          const existing = prev[qid];
          // If we don't yet know option count length, try to infer from question
          const question = questions.find((q) => (q._id || q.id || q.text) === qid);
          const len = existing?.length ?? (question?.options?.length || 0);
          if (len <= 0) return prev;
          const next = existing ? [...existing] : new Array(len).fill(0);
          const idx = payload.selectedOptionIndex;
          if (idx >= 0 && idx < len) next[idx] += 1;
          return { ...prev, [qid]: next };
        });
      });

      // Optional aggregate push event from backend
      s.on("metrics_update", (msg) => {
        // Accept shape: { type: 'question_counts', question_id, counts: number[] }
        if (msg?.type === "question_counts" && msg?.question_id && Array.isArray(msg.counts)) {
          setCounts((prev) => ({ ...prev, [msg.question_id]: msg.counts }));
        }
      });

      s.on("connect_error", (err) => {
        // eslint-disable-next-line no-console
        console.warn("Socket connect_error", err?.message);
      });

      return () => {
        try {
          s.removeAllListeners();
          s.disconnect();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to initialize socket", e);
      return () => {};
    }
  }, [questions]);

  const user = getStoredUser();

  // Ocean Professional cohesive palette for charts
  const COLORS = [
    "var(--chart-palette-1)",
    "var(--chart-palette-2)",
    "var(--chart-palette-3)",
    "var(--chart-palette-4)",
    "var(--chart-palette-5)",
    "var(--chart-palette-6)",
    "var(--chart-palette-7)",
    "var(--chart-palette-8)",
  ];

  const handleSelect = (qid, idx) => {
    setSelected((prev) => ({ ...prev, [qid]: idx }));
  };

  const announce = (type, text) => {
    setToast({ type, text });
    // Auto-dismiss after 3 seconds
    window.clearTimeout(announce._t);
    announce._t = window.setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (qid) => {
    const idx = selected[qid];
    if (typeof idx !== "number") return;
    setSubmitting((p) => ({ ...p, [qid]: true }));
    try {
      await submitAnswer({ question_id: qid, selectedOptionIndex: idx });
      setSubmitted((p) => ({ ...p, [qid]: true }));
      announce("success", "Your answer has been submitted.");
      // Optimistic update counts; socket will reconcile
      setCounts((prev) => {
        const question = questions.find((q) => (q._id || q.id || q.text) === qid);
        const len = prev[qid]?.length ?? (question?.options?.length || 0);
        if (len <= 0) return prev;
        const next = prev[qid] ? [...prev[qid]] : new Array(len).fill(0);
        if (idx >= 0 && idx < len) next[idx] += 1;
        return { ...prev, [qid]: next };
      });
    } catch (e) {
      announce("error", e?.message || "Failed to submit answer");
    } finally {
      setSubmitting((p) => ({ ...p, [qid]: false }));
    }
  };

  const getQuestionId = (q) => q._id || q.id || q.text;

  const numberFmt = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined);
  };
  const formatPercent = (value, total) => {
    const t = total || 0;
    if (!t) return "0%";
    return `${((value / t) * 100).toFixed(1)}%`;
  };

  // Accessible, themed Donut (responsive via .chart-container)
  const Donut = ({ qid, options }) => {
    const data = useMemo(() => {
      const arr = counts[qid] || [];
      if (!Array.isArray(arr) || arr.length === 0) return [];
      return arr.map((count, i) => ({
        name: `${String.fromCharCode(65 + i)}. ${options?.[i]?.text ?? "Option"}`,
        value: count,
      }));
    }, [counts[qid], options]);

    if (!data || data.length === 0) {
      return (
        <div className="empty-state" role="status" aria-live="polite">
          <span className="empty-icon" aria-hidden="true">ⓘ</span>
          <span>No responses yet</span>
        </div>
      );
    }

    const total = data.reduce((a, b) => a + b.value, 0);

    return (
      <div className="chart-container chart-gradient" role="img" aria-label="Donut chart of responses">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={96}
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} stroke="rgba(17,24,39,0.08)" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${numberFmt(value)} (${formatPercent(value, total)})`, name]}
              labelFormatter={(label) => `Option: ${label}`}
            />
            <Legend
              verticalAlign="bottom"
              height={40}
              formatter={(value) => (
                <span style={{ color: "var(--chart-legend-text)" }} aria-label={`Legend: ${value}`}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // OptionCard: keyboard-accessible, hover/active styled option
  const OptionCard = ({ id, name, idx, label, selectedIdx, onSelect, disabled }) => {
    const checked = selectedIdx === idx;
    return (
      <div
        className={`option-card ${checked ? "selected" : ""} ${disabled ? "disabled" : ""}`}
        role="radio"
        aria-checked={checked}
        tabIndex={0}
        aria-disabled={disabled ? "true" : "false"}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        onClick={() => {
          if (!disabled) onSelect();
        }}
      >
        <div className="option-left">
          {/* Visually hide native input but keep it for a11y and forms */}
          <input
            id={id}
            type="radio"
            name={name}
            checked={checked}
            onChange={onSelect}
            aria-labelledby={`${id}-label`}
            style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
          />
          <span className="option-key" aria-hidden="true">
            {String.fromCharCode(65 + idx)}.
          </span>
          <span id={`${id}-label`} className="option-text">
            {label}
          </span>
        </div>
        <span
          className={`pill ${checked ? "pill-click" : ""}`}
          aria-hidden={checked ? "false" : "true"}
        >
          {checked ? "Selected" : "Choose"}
        </span>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Header title="Questions" subtitle="Answer MCQs and see live results" />

      {/* Toast notification */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`inline-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}
        >
          {toast.text}
        </div>
      ) : null}

      {loading ? <div className="skeleton skeleton-text" aria-busy="true">Loading questions…</div> : null}
      {loadError ? <div className="auth-error" style={{ margin: "12px 0" }}>{String(loadError)}</div> : null}
      {!loading && questions.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <span className="empty-icon" aria-hidden="true">ⓘ</span>
          <span>No questions available</span>
        </div>
      ) : null}

      <section className="dashboard-grid" aria-label="Questions list">
        {questions.map((q) => {
          const qid = getQuestionId(q);
          const chosen = selected[qid];
          const isSubmitting = !!submitting[qid];
          const isSubmitted = !!submitted[qid];
          return (
            <div className="dash-card" key={qid} aria-labelledby={`${qid}-title`}>
              <h3 id={`${qid}-title`} className="dash-heading">{q.text}</h3>
              <p className="dash-subheading">Choose one option below</p>

              <div
                role="radiogroup"
                aria-label={`Options for question ${q.text}`}
                className="options-grid"
              >
                {(q.options || []).map((opt, idx) => {
                  const id = `${qid}-opt-${idx}`;
                  return (
                    <OptionCard
                      key={id}
                      id={id}
                      name={`q-${qid}`}
                      idx={idx}
                      label={opt?.text || "-"}
                      selectedIdx={chosen}
                      onSelect={() => handleSelect(qid, idx)}
                      disabled={isSubmitted}
                    />
                  );
                })}
              </div>

              <div className="actions-row">
                <button
                  className="btn-primary"
                  disabled={typeof chosen !== "number" || isSubmitting || isSubmitted}
                  onClick={() => handleSubmit(qid)}
                  title={user ? `Answer as ${user.username || user.email}` : "Answer"}
                  aria-busy={isSubmitting ? "true" : "false"}
                >
                  {isSubmitting ? "Submitting…" : isSubmitted ? "Submitted" : "Submit Answer"}
                </button>
                {isSubmitted ? (
                  <span className="hint muted">Your response was recorded.</span>
                ) : null}
              </div>

              <div style={{ marginTop: 12 }}>
                <Donut qid={qid} options={q.options} />
              </div>
            </div>
          );
        })}
      </section>

      <footer className="footer">
        <span>Ocean Professional Theme</span>
      </footer>
    </div>
  );
}
