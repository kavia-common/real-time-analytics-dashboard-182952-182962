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

  const COLORS = ["#2563EB", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#06B6D4"];

  const handleSelect = (qid, idx) => {
    setSelected((prev) => ({ ...prev, [qid]: idx }));
  };

  const handleSubmit = async (qid) => {
    const idx = selected[qid];
    if (typeof idx !== "number") return;
    setSubmitting((p) => ({ ...p, [qid]: true }));
    try {
      await submitAnswer({ question_id: qid, selectedOptionIndex: idx });
      setSubmitted((p) => ({ ...p, [qid]: true }));
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
      // eslint-disable-next-line no-alert
      alert(e?.message || "Failed to submit answer");
    } finally {
      setSubmitting((p) => ({ ...p, [qid]: false }));
    }
  };

  const getQuestionId = (q) => q._id || q.id || q.text;

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
      return <div className="muted">No responses yet.</div>;
    }

    return (
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Header title="Questions" subtitle="Answer MCQs and see live results" />
      {loading ? <div className="muted">Loading questions…</div> : null}
      {loadError ? <div className="auth-error" style={{ margin: "12px 0" }}>{String(loadError)}</div> : null}
      {!loading && questions.length === 0 ? <div className="muted">No questions available.</div> : null}

      <div className="cards">
        {questions.map((q) => {
          const qid = getQuestionId(q);
          const chosen = selected[qid];
          const isSubmitting = !!submitting[qid];
          const isSubmitted = !!submitted[qid];
          return (
            <div className="card" key={qid}>
              <h3 className="section-title" style={{ marginBottom: 8 }}>{q.text}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                {(q.options || []).map((opt, idx) => {
                  const id = `${qid}-opt-${idx}`;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className="auth-label"
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        background: "var(--color-surface)",
                        borderRadius: 10,
                        padding: "8px 10px",
                        margin: 0,
                        boxShadow: "var(--shadow-sm)",
                        border: chosen === idx ? "1px solid rgba(37,99,235,0.35)" : "1px solid #e5e7eb",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input
                          id={id}
                          type="radio"
                          name={`q-${qid}`}
                          checked={chosen === idx}
                          onChange={() => handleSelect(qid, idx)}
                        />
                        <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + idx)}.</span>
                        <span>{opt?.text || "-"}</span>
                      </div>
                      {isSubmitted ? (
                        <span className="pill pill-view">Selected</span>
                      ) : null}
                    </label>
                  );
                })}
              </div>

              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="btn-primary"
                  disabled={typeof chosen !== "number" || isSubmitting || isSubmitted}
                  onClick={() => handleSubmit(qid)}
                  title={user ? `Answer as ${user.username || user.email}` : "Answer"}
                >
                  {isSubmitting ? "Submitting…" : isSubmitted ? "Submitted" : "Submit Answer"}
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                <Donut qid={qid} options={q.options} />
              </div>
            </div>
          );
        })}
      </div>

      <footer className="footer">
        <span>Ocean Professional Theme</span>
      </footer>
    </div>
  );
}
