import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, collection, onSnapshot,
  addDoc, serverTimestamp
} from "firebase/firestore";

const TABS = [
  { id: "map",      label: "Venue Map",  icon: "🗺️" },
  { id: "egress",   label: "Exit Guide", icon: "🚪" },
  { id: "chants",   label: "Chants",     icon: "📣" },
  { id: "food",     label: "Food",       icon: "🍔" },
  { id: "feedback", label: "Feedback",   icon: "📝" },
];

export default function AttendeeView() {
  const [activeTab, setActiveTab] = useState("map");

  return (
    <div className="page page-bg">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🏟️</div>
          <span>StadiumSync</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="header-badge badge-attendee">Attendee</span>
          <Link to="/" className="btn btn-secondary btn-sm">Home</Link>
        </div>
      </header>

      {/* Tab Nav */}
      <div style={{ padding: "16px 20px 0" }}>
        <nav className="tab-nav" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`attendee-tab-${t.id}`}
              className={`tab-btn${activeTab === t.id ? " active" : ""}`}
              onClick={() => setActiveTab(t.id)}
              role="tab"
              aria-selected={activeTab === t.id}
            >
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <main className="section">
        {activeTab === "map"      && <MapSection />}
        {activeTab === "egress"   && <EgressSection />}
        {activeTab === "chants"   && <ChantsSection />}
        {activeTab === "food"     && <FoodSection />}
        {activeTab === "feedback" && <FeedbackSection />}
      </main>
    </div>
  );
}

/* ─── Map Section ────────────────────────────────────────────── */
function MapSection() {
  const [mapUrl, setMapUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "venueMap"), (snap) => {
      setMapUrl(snap.exists() ? snap.data().imageUrl : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 className="section-title">🗺️ Venue Map</h2>
      <p className="section-subtitle">Official floor plan and seating layout of the venue.</p>

      <div className="panel">
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
            <div className="empty-state-text">Loading map…</div>
          </div>
        ) : mapUrl ? (
          <div className="map-container" style={{ aspectRatio: "auto", minHeight: 220 }}>
            <img src={mapUrl} alt="Venue map" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🗺️</div>
            <div className="empty-state-text">No map uploaded yet. Check back soon!</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Egress Section ─────────────────────────────────────────── */
function EgressSection() {
  const [data, setData] = useState({ message: "", active: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "egressMessage"), (snap) => {
      setData(snap.exists() ? snap.data() : { message: "", active: false });
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="section-title">🚪 Exit Guide</h2>
      <p className="section-subtitle">Live exit instructions from the event coordinator.</p>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
        </div>
      ) : (
        <>
          <div className={`egress-banner${data.active ? " active" : " inactive"}`}>
            <span className="egress-icon">{data.active ? "🚨" : "✅"}</span>
            <div>
              <div style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
                color: data.active ? "#fcd34d" : "var(--text-muted)"
              }}>
                {data.active ? "Exit Direction — Active" : "All Clear"}
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                {data.active && data.message
                  ? data.message
                  : "No active exit instructions. Enjoy the event!"}
              </div>
            </div>
          </div>

          {data.active && (
            <div className="notice notice-warning" style={{ marginTop: 20 }}>
              <span>ℹ️</span>
              <span>Please follow instructions calmly and assist others around you.</span>
            </div>
          )}

          <div className="panel" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>General Safety Tips</h3>
            {[
              "Walk — don't run — when exiting.",
              "Stay with your group and keep children close.",
              "Follow signage and staff instructions.",
              "Do not use elevators during an emergency evacuation.",
              "Move away from the venue once outside.",
            ].map((tip, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, padding: "9px 0",
                borderBottom: i < 4 ? "1px solid var(--border)" : "none",
                fontSize: "0.88rem", color: "var(--text-secondary)"
              }}>
                <span style={{ color: "var(--accent-green)", flexShrink: 0 }}>✓</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Chants Section ─────────────────────────────────────────── */
function ChantsSection() {
  const [data, setData] = useState({ text: "", active: false });
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "activeChant"), (snap) => {
      const d = snap.exists() ? snap.data() : { text: "", active: false };
      setData(d);
      setLoading(false);
      if (!d.active) setJoined(false);
    });
    return unsub;
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="section-title">📣 Crowd Chants</h2>
      <p className="section-subtitle">Join the crowd! Chants are broadcast live by the coordinator.</p>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
        </div>
      ) : data.active && data.text ? (
        <>
          <div className="chant-display" style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, marginBottom: 16
            }}>
              <span className="status-dot live" />
              <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#6ee7b7", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Live Chant
              </span>
            </div>
            <div className="chant-text">{data.text}</div>

            {joined && (
              <div style={{
                marginTop: 20, fontSize: "0.85rem", color: "#a5b4fc",
                animation: "pop-in 0.3s ease"
              }}>
                🎉 You're chanting along!
              </div>
            )}
          </div>

          <button
            id="join-chant-btn"
            className={`btn btn-full btn-lg ${joined ? "btn-success" : "btn-primary"}`}
            onClick={() => setJoined((p) => !p)}
          >
            {joined ? "✋ Stop Chanting" : "🙌 Join the Chant!"}
          </button>
        </>
      ) : (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-state-icon">🎤</div>
            <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 8 }}>No Active Chant</div>
            <div className="empty-state-text">
              Stay tuned — the coordinator will start one soon!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Food Section ───────────────────────────────────────────── */
function FoodSection() {
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "menus"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setStalls(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 className="section-title">🍔 Food & Beverages</h2>
      <p className="section-subtitle">Browse menus from all food stalls at the venue.</p>

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
        </div>
      ) : stalls.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-state-icon">🍽️</div>
            <div className="empty-state-text">No menus available yet. Check back soon!</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {stalls.map((stall) => (
            <div key={stall.id} className="stall-card">
              {/* Stall image */}
              {stall.imageUrl && (
                <img
                  src={stall.imageUrl}
                  alt={stall.name}
                  style={{ width: "100%", height: 160, objectFit: "cover" }}
                />
              )}

              <div className="stall-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.4rem" }}>🏪</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{stall.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {stall.items?.length || 0} item{stall.items?.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpanded(expanded === stall.id ? null : stall.id)}
                  >
                    {expanded === stall.id ? "Hide ▲" : "View Menu ▼"}
                  </button>
                </div>
              </div>

              {expanded === stall.id && (
                <div className="stall-items">
                  {!stall.items?.length ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "8px 0" }}>
                      Menu coming soon…
                    </p>
                  ) : (
                    stall.items.map((item, i) => (
                      <div key={i} className="menu-item">
                        <span className="menu-item-name">{item.name}</span>
                        <span className="menu-item-price">{item.price}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Feedback Section ───────────────────────────────────────── */
function FeedbackSection() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setLoading(true);
    await addDoc(collection(db, "feedback"), {
      rating,
      comment: comment.trim(),
      category,
      createdAt: serverTimestamp(),
    });
    setLoading(false);
    setSubmitted(true);
  };

  const CATEGORIES = [
    { value: "general",   label: "General Experience" },
    { value: "food",      label: "Food & Beverages" },
    { value: "crowd",     label: "Crowd Management" },
    { value: "safety",    label: "Safety & Security" },
    { value: "facilities",label: "Facilities & Amenities" },
  ];

  const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];

  if (submitted) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="panel">
          <div className="thankyou-msg">
            <div className="thankyou-icon">🎉</div>
            <h2 style={{ fontSize: "1.4rem" }}>Thank You!</h2>
            <p>Your feedback has been submitted and will help us improve future events.</p>
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
              {[1,2,3,4,5].map((s) => (
                <span key={s} style={{ fontSize: "1.4rem" }}>
                  {s <= rating ? "⭐" : "☆"}
                </span>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 16 }}
              onClick={() => { setSubmitted(false); setRating(0); setComment(""); setCategory("general"); }}
            >
              Submit Another Response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h2 className="section-title">📝 Share Your Feedback</h2>
      <p className="section-subtitle">Help us make future events even better.</p>

      <div className="panel">
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Star Rating */}
          <div className="form-group">
            <label className="form-label">Your Rating</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
              <div className="stars">
                {[1,2,3,4,5].map((s) => (
                  <span
                    key={s}
                    id={`star-${s}`}
                    className={`star${s <= (hover || rating) ? " active" : ""}`}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    role="button"
                    aria-label={`${s} star${s > 1 ? "s" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    {s <= (hover || rating) ? "⭐" : "☆"}
                  </span>
                ))}
              </div>
              {(hover || rating) > 0 && (
                <span style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--accent-blue)",
                  animation: "pop-in 0.2s ease"
                }}>
                  {STAR_LABELS[hover || rating]}
                </span>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="feedback-category">Category</label>
            <select
              id="feedback-category"
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Comment */}
          <div className="form-group">
            <label className="form-label" htmlFor="feedback-comment">Comments (optional)</label>
            <textarea
              id="feedback-comment"
              className="form-textarea"
              rows={4}
              placeholder="Tell us about your experience…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            id="feedback-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading || rating === 0}
          >
            {loading ? <span className="spinner" /> : "Submit Feedback ✨"}
          </button>

          {rating === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginTop: -8 }}>
              Please select a star rating to continue.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
