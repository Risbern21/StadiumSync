import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function AttendeeGate() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventCode, setEventCode] = useState(null);
  const [eventName, setEventName] = useState("");
  const [codeActive, setCodeActive] = useState(false);
  const navigate = useNavigate();

  // Check if already validated this session
  useEffect(() => {
    const saved = sessionStorage.getItem("ss_event_code");
    if (saved) navigate("/attendee/view", { replace: true });
  }, [navigate]);

  // Listen to the active event code from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "eventCode"), (snap) => {
      if (snap.exists()) {
        setEventCode(snap.data().code || null);
        setEventName(snap.data().eventName || "");
        setCodeActive(snap.data().active ?? false);
      } else {
        setEventCode(null);
        setCodeActive(false);
      }
    });
    return unsub;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!codeActive || !eventCode) {
      setError("No active event found. Please check with your coordinator.");
      setLoading(false);
      return;
    }

    if (input.trim().toUpperCase() !== eventCode.toUpperCase()) {
      setError("Invalid event code. Please check with your coordinator.");
      setLoading(false);
      return;
    }

    // Valid — persist in session so they don't re-enter on refresh
    sessionStorage.setItem("ss_event_code", eventCode);
    sessionStorage.setItem("ss_event_name", eventName);
    navigate("/attendee/view", { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "2.8rem", marginBottom: 12 }}>🎟️</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: 6 }}>
            Enter <span className="gradient-text">Event Code</span>
          </h1>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
            Your coordinator will provide a unique 6-character code to access event information.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="event-code-input">Event Code</label>
            <input
              id="event-code-input"
              type="text"
              className="form-input"
              placeholder="e.g. ABC123"
              value={input}
              onChange={(e) => {
                setInput(e.target.value.toUpperCase().slice(0, 8));
                setError("");
              }}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              style={{
                textAlign: "center",
                fontSize: "1.6rem",
                fontWeight: 800,
                fontFamily: "'Outfit', monospace",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
              }}
              required
            />
          </div>

          {error && (
            <div className="notice notice-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            id="gate-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading || input.trim().length < 4}
          >
            {loading ? <span className="spinner" /> : "Join Event →"}
          </button>
        </form>

        <div className="divider" />
        <Link to="/" className="btn btn-secondary btn-full">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
