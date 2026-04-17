import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase";
import {
  doc, setDoc, collection, addDoc, deleteDoc,
  onSnapshot, serverTimestamp, getDocs,
  query, where
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { GoogleGenerativeAI } from "@google/generative-ai";

const TABS = [
  { id: "map", label: "Venue Map", icon: "🗺️" },
  { id: "egress", label: "Exit Guide", icon: "🚪" },
  { id: "chant", label: "Chants", icon: "📣" },
  { id: "menu", label: "Food Menus", icon: "🍔" },
  { id: "code", label: "Event Code", icon: "🎫" },
  { id: "feedback", label: "Feedback", icon: "📝" },
];

export default function CoordinatorDashboard() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("map");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) navigate("/coordinator/login");
    });
    return unsub;
  }, [navigate]);

  if (!authChecked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh" }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="page page-bg">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🏟️</div>
          <span>StadiumSync</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="header-badge badge-coordinator">Coordinator</span>
          <button
            id="sign-out-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => signOut(auth)}
            title="Sign out"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <div style={{ padding: "16px 20px 0" }}>
        <nav className="tab-nav" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
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
        {activeTab === "map" && <MapManager coordinatorId={user.uid} />}
        {activeTab === "egress" && <EgressManager coordinatorId={user.uid} />}
        {activeTab === "chant" && <ChantManager coordinatorId={user.uid} />}
        {activeTab === "menu" && <MenuManager coordinatorId={user.uid} />}
        {activeTab === "code" && <EventCodeManager coordinatorId={user.uid} />}
        {activeTab === "feedback" && <FeedbackManager coordinatorId={user.uid} />}
      </main>
    </div>
  );
}

/* ─── Map Manager ──────────────────────────────────────────── */
function MapManager({ coordinatorId }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [mapEventCode, setMapEventCode] = useState(null);
  const [activeEventCode, setActiveEventCode] = useState(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    const unsubEvent = onSnapshot(doc(db, "config", `eventCode_${coordinatorId}`), (snap) => {
      if (snap.exists() && snap.data().active) {
        setActiveEventCode(snap.data().code);
      } else {
        setActiveEventCode(null);
      }
    });

    const unsubMap = onSnapshot(doc(db, "config", `venueMap_${coordinatorId}`), (snap) => {
      if (snap.exists()) {
        setCurrentUrl(snap.data().imageUrl);
        setMapEventCode(snap.data().eventCode || null);
      } else {
        setCurrentUrl(null);
        setMapEventCode(null);
      }
    });
    return () => { unsubEvent(); unsubMap(); };
  }, [coordinatorId]);

  const handleUpload = (file) => {
    if (!activeEventCode) {
      alert("Please generate and activate an Event Code first.");
      return;
    }
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setSaved(false);
    const storageRef = ref(storage, `maps/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => { console.error(err); setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await setDoc(doc(db, "config", `venueMap_${coordinatorId}`), { 
          imageUrl: url, 
          updatedAt: serverTimestamp(),
          eventCode: activeEventCode 
        });
        setCurrentUrl(url);
        setMapEventCode(activeEventCode);
        setUploading(false);
        setSaved(true);
      }
    );
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (activeEventCode) handleUpload(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => e.preventDefault();

  const deleteMap = async () => {
    if (!window.confirm("Are you sure you want to delete this map?")) return;
    try {
      await deleteDoc(doc(db, "config", `venueMap_${coordinatorId}`));
      setCurrentUrl(null);
      setMapEventCode(null);
      setSaved(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete map: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="section-title">🗺️ Venue Map</h2>
      <p className="section-subtitle">Upload the floor plan or seating map of the venue.</p>

      <div className="panel">
        <div
          className={`upload-zone${!activeEventCode ? " disabled" : ""}`}
          onClick={() => activeEventCode && fileRef.current.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          style={!activeEventCode ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
        >
          <div className="upload-zone-icon">📁</div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Click or drag & drop to upload</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>PNG, JPG, WEBP supported</p>
          <input
            id="map-file-input"
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files[0])}
          />
        </div>

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>Uploading…</span>
              <span style={{ fontSize: "0.84rem", color: "var(--accent-blue)" }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {saved && (
          <div className="notice notice-success" style={{ marginTop: 16 }}>
            <span>✅</span><span>Map uploaded and saved to Firestore.</span>
          </div>
        )}
      </div>

      {currentUrl && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 600 }}>Current Map</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {mapEventCode === activeEventCode && activeEventCode ? (
                <span className="tag tag-green">Live for {mapEventCode}</span>
              ) : mapEventCode ? (
                <span className="tag tag-blue">Hidden (Associated with {mapEventCode})</span>
              ) : (
                <span className="tag tag-green">Live (Global)</span>
              )}
              <button 
                className="btn btn-danger btn-sm" 
                onClick={deleteMap}
                title="Delete Map"
              >
                🗑
              </button>
            </div>
          </div>
          <div className="map-container">
            <img src={currentUrl} alt="Venue map" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Egress Manager ────────────────────────────────────────── */
function EgressManager({ coordinatorId }) {
  const [message, setMessage] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", `egressMessage_${coordinatorId}`), (snap) => {
      if (snap.exists()) {
        setMessage(snap.data().message || "");
        setActive(snap.data().active || false);
      }
    });
    return unsub;
  }, [coordinatorId]);

  const broadcast = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "config", `egressMessage_${coordinatorId}`), {
        message: message.trim(),
        active: true,
        updatedAt: serverTimestamp(),
      });
      setActive(true);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to broadcast message: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    await setDoc(doc(db, "config", `egressMessage_${coordinatorId}`), {
      message: "",
      active: false,
      updatedAt: serverTimestamp(),
    });
    setActive(false);
    setMessage("");
  };

  const STAND_TEMPLATES = [
    "Stand A, please make your way to Gate 1.",
    "Stand B, please exit via Gate 3 now.",
    "Stand C, please proceed to the North Exit.",
    "VIP section, please exit via the East Lounge.",
    "All stands — event has concluded. Exit safely.",
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="section-title">🚪 Exit Guide</h2>
      <p className="section-subtitle">Direct attendees to exit safely. Instructions appear live on attendee screens.</p>

      {/* Preview */}
      <div className={`egress-banner${active ? " active" : " inactive"}`} style={{ marginBottom: 20 }}>
        <span className="egress-icon">{active ? "🚨" : "💤"}</span>
        <div>
          <div style={{ fontSize: "0.75rem", color: active ? "#fcd34d" : "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>
            {active ? "LIVE — Attendees can see this" : "No active direction"}
          </div>
          <div style={{ fontWeight: 700 }}>{message || "No message set"}</div>
        </div>
      </div>

      <div className="panel">
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Quick Templates</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STAND_TEMPLATES.map((t, i) => (
              <button
                key={i}
                className="btn btn-secondary btn-sm"
                onClick={() => setMessage(t)}
              >
                {t.split(",")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="egress-msg">Custom Message</label>
          <textarea
            id="egress-msg"
            className="form-textarea"
            rows={3}
            placeholder="e.g. Stand B, please leave first via Gate 2…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            id="egress-broadcast-btn"
            className="btn btn-amber"
            onClick={broadcast}
            disabled={loading || !message.trim()}
            style={{ flex: 1 }}
          >
            {loading ? <span className="spinner" /> : "📡 Broadcast"}
          </button>
          <button
            id="egress-clear-btn"
            className="btn btn-secondary"
            onClick={clear}
          >
            Clear
          </button>
        </div>

        {sent && (
          <div className="notice notice-success" style={{ marginTop: 12 }}>
            <span>✅</span><span>Message broadcast to all attendees!</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Chant Manager ─────────────────────────────────────────── */
function ChantManager({ coordinatorId }) {
  const [chant, setChant] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", `activeChant_${coordinatorId}`), (snap) => {
      if (snap.exists()) {
        setChant(snap.data().text || "");
        setActive(snap.data().active || false);
      }
    });
    return unsub;
  }, [coordinatorId]);

  const broadcast = async () => {
    if (!chant.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "config", `activeChant_${coordinatorId}`), {
        text: chant.trim(),
        active: true,
        updatedAt: serverTimestamp(),
      });
      setActive(true);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to broadcast chant: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    await setDoc(doc(db, "config", `activeChant_${coordinatorId}`), {
      text: "",
      active: false,
      updatedAt: serverTimestamp(),
    });
    setActive(false);
    setChant("");
  };

  const CHANT_PRESETS = [
    "Let's go! Let's go! Let's GO! 🔥",
    "OLE OLE OLE OLE! ⚽",
    "WE ARE THE CHAMPIONS! 🏆",
    "DEF-ENSE! DEF-ENSE! 🛡️",
    "HERE WE GO! HERE WE GO! 🎉",
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 className="section-title">📣 Chant Broadcaster</h2>
      <p className="section-subtitle">Send crowd chants to all attendee screens in real time.</p>

      {/* Live preview */}
      <div className="chant-display" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <span className={`status-dot ${active ? "live" : "inactive"}`} />
          <span style={{ fontSize: "0.78rem", color: active ? "#6ee7b7" : "var(--text-muted)", fontWeight: 600 }}>
            {active ? "LIVE ON ATTENDEE SCREENS" : "PREVIEW"}
          </span>
        </div>
        <div className="chant-text">{chant || "Your chant appears here…"}</div>
      </div>

      <div className="panel">
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Preset Chants</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CHANT_PRESETS.map((c, i) => (
              <button
                key={i}
                className="btn btn-secondary"
                style={{ justifyContent: "flex-start", textAlign: "left" }}
                onClick={() => setChant(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="chant-input">Custom Chant</label>
          <textarea
            id="chant-input"
            className="form-textarea"
            rows={3}
            placeholder="Type your chant here…"
            value={chant}
            onChange={(e) => setChant(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            id="chant-broadcast-btn"
            className="btn btn-primary"
            onClick={broadcast}
            disabled={loading || !chant.trim()}
            style={{ flex: 1 }}
          >
            {loading ? <span className="spinner" /> : "📣 Broadcast Chant"}
          </button>
          <button
            id="chant-stop-btn"
            className="btn btn-secondary"
            onClick={stop}
          >
            Stop
          </button>
        </div>

        {sent && (
          <div className="notice notice-success" style={{ marginTop: 12 }}>
            <span>✅</span><span>Chant is now live on attendee screens!</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Menu Manager ──────────────────────────────────────────── */
function MenuManager({ coordinatorId }) {
  const [stalls, setStalls] = useState([]);
  const [newStallName, setNewStallName] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedStall, setExpandedStall] = useState(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [uploading, setUploading] = useState({});
  const fileRef = useRef({});

  useEffect(() => {
    const qSelect = query(collection(db, "menus"), where("coordinatorId", "==", coordinatorId));
    const unsub = onSnapshot(qSelect, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setStalls(data);
    });
    return unsub;
  }, [coordinatorId]);

  const addStall = async () => {
    if (!newStallName.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "menus"), {
        name: newStallName.trim(),
        items: [],
        imageUrl: null,
        coordinatorId,
        createdAt: serverTimestamp(),
      });
      setNewStallName("");
    } catch (err) {
      console.error(err);
      alert("Failed to add stall: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStall = async (id) => {
    await deleteDoc(doc(db, "menus", id));
    if (expandedStall === id) setExpandedStall(null);
  };

  const addItem = async (stallId, items) => {
    if (!itemName.trim() || !itemPrice.trim()) return;
    const updated = [...items, { name: itemName.trim(), price: itemPrice.trim() }];
    await setDoc(doc(db, "menus", stallId), { items: updated }, { merge: true });
    setItemName("");
    setItemPrice("");
  };

  const removeItem = async (stallId, items, idx) => {
    const updated = items.filter((_, i) => i !== idx);
    await setDoc(doc(db, "menus", stallId), { items: updated }, { merge: true });
  };

  const uploadImage = (stallId, file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading((p) => ({ ...p, [stallId]: 0 }));
    const storageRef = ref(storage, `menus/${stallId}_${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => setUploading((p) => ({ ...p, [stallId]: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) })),
      (err) => console.error(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await setDoc(doc(db, "menus", stallId), { imageUrl: url }, { merge: true });
        setUploading((p) => { const n = { ...p }; delete n[stallId]; return n; });
      }
    );
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 className="section-title">🍔 Food Menus</h2>
      <p className="section-subtitle">Add food stalls with their menus. Attendees can browse them in real time.</p>

      {/* Add Stall */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label" htmlFor="stall-name">New Food Stall</label>
          <div className="inline-form">
            <input
              id="stall-name"
              type="text"
              className="form-input"
              placeholder="e.g. Burger Zone, Pizza Corner…"
              value={newStallName}
              onChange={(e) => setNewStallName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addStall()}
            />
            <button
              id="add-stall-btn"
              className="btn btn-primary"
              onClick={addStall}
              disabled={loading || !newStallName.trim()}
            >
              {loading ? <span className="spinner" /> : "+ Add Stall"}
            </button>
          </div>
        </div>
      </div>

      {/* Stall List */}
      {stalls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <div className="empty-state-text">No food stalls yet. Add one above.</div>
        </div>
      ) : (
        stalls.map((stall) => (
          <div key={stall.id} className="panel" style={{ marginBottom: 14 }}>
            {/* Stall Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expandedStall === stall.id ? 16 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.4rem" }}>🏪</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{stall.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{stall.items?.length || 0} items</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setExpandedStall(expandedStall === stall.id ? null : stall.id)}
                >
                  {expandedStall === stall.id ? "Collapse ▲" : "Manage ▼"}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteStall(stall.id)}
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Expanded */}
            {expandedStall === stall.id && (
              <div>
                {/* Image upload */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">Stall Image</label>
                  {stall.imageUrl && (
                    <img src={stall.imageUrl} alt={stall.name} className="menu-image-preview" style={{ marginBottom: 8 }} />
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileRef.current[stall.id]?.click()}
                  >
                    📷 {stall.imageUrl ? "Change Image" : "Upload Image"}
                  </button>
                  <input
                    ref={(el) => (fileRef.current[stall.id] = el)}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => uploadImage(stall.id, e.target.files[0])}
                  />
                  {uploading[stall.id] !== undefined && (
                    <div className="progress-bar" style={{ marginTop: 8 }}>
                      <div className="progress-fill" style={{ width: `${uploading[stall.id]}%` }} />
                    </div>
                  )}
                </div>

                <div className="divider" />

                {/* Items */}
                <div style={{ marginBottom: 12 }}>
                  <div className="form-label" style={{ marginBottom: 10 }}>Menu Items</div>
                  {(stall.items || []).map((item, idx) => (
                    <div key={idx} className="list-row">
                      <div className="list-row-info">
                        <div className="list-row-title">{item.name}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>{item.price}</span>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => removeItem(stall.id, stall.items, idx)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Item */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Item name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    style={{ flex: "2 1 140px" }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Price"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    style={{ flex: "1 1 90px" }}
                  />
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => addItem(stall.id, stall.items || [])}
                    disabled={!itemName.trim() || !itemPrice.trim()}
                  >
                    + Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ─── Event Code Manager ────────────────────────────────────── */
function EventCodeManager({ coordinatorId }) {
  const [code, setCode] = useState("");
  const [eventName, setEventName] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", `eventCode_${coordinatorId}`), (snap) => {
      if (snap.exists()) {
        setCode(snap.data().code || "");
        setEventName(snap.data().eventName || "");
        setActive(snap.data().active ?? false);
      }
    });
    return unsub;
  }, [coordinatorId]);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(result);
    setSaved(false);
  };

  const saveCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "config", `eventCode_${coordinatorId}`), {
        code: code.trim().toUpperCase(),
        eventName: eventName.trim(),
        coordinatorId,
        active: true,
        type: "eventCode",
        updatedAt: serverTimestamp(),
      });
      setActive(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save code: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async () => {
    await setDoc(doc(db, "config", `eventCode_${coordinatorId}`), {
      active: !active,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setActive((p) => !p);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <h2 className="section-title">🎫 Event Code</h2>
      <p className="section-subtitle">
        Generate a unique code and share it with attendees. Only those with the code can join the event.
      </p>

      {/* Live Code Card */}
      {code && (
        <div style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
          textAlign: "center",
          marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}>
            <span className={`status-dot ${active ? "live" : "inactive"}`} />
            <span style={{
              fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: active ? "#6ee7b7" : "var(--text-muted)",
            }}>
              {active ? "Active — Attendees can join" : "Inactive — Access disabled"}
            </span>
          </div>

          <div style={{
            fontFamily: "'Outfit', monospace",
            fontSize: "clamp(2rem, 10vw, 3rem)",
            fontWeight: 900,
            letterSpacing: "0.3em",
            background: "linear-gradient(135deg, #fff, #a5b4fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 12,
          }}>
            {code}
          </div>

          {eventName && (
            <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              📍 {eventName}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button id="copy-code-btn" className="btn btn-secondary btn-sm" onClick={copyCode}>
              {copied ? "✅ Copied!" : "📋 Copy Code"}
            </button>
            <button
              id="toggle-code-btn"
              className={`btn btn-sm ${active ? "btn-danger" : "btn-success"}`}
              onClick={toggleActive}
            >
              {active ? "🔒 Deactivate" : "🔓 Activate"}
            </button>
          </div>
        </div>
      )}

      {/* Generator Form */}
      <div className="panel">
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="event-name-input">
            Event Name <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(shown to attendees)</span>
          </label>
          <input
            id="event-name-input"
            type="text"
            className="form-input"
            placeholder="e.g. Champions League Final 2025"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="code-manual-input">Code</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="code-manual-input"
              type="text"
              className="form-input"
              placeholder="Auto-generated or type custom"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, 8).replace(/[^A-Z0-9]/g, ""));
                setSaved(false);
              }}
              style={{ fontFamily: "'Outfit', monospace", fontSize: "1.2rem", fontWeight: 700, letterSpacing: "0.2em" }}
              maxLength={8}
            />
            <button id="generate-code-btn" className="btn btn-secondary" onClick={generateCode} style={{ flexShrink: 0 }}>
              🎲 Generate
            </button>
          </div>
        </div>

        <button
          id="save-code-btn"
          className="btn btn-primary btn-full"
          onClick={saveCode}
          disabled={loading || !code.trim()}
        >
          {loading ? <span className="spinner" /> : "✅ Save & Activate Code"}
        </button>

        {saved && (
          <div className="notice notice-success" style={{ marginTop: 12 }}>
            <span>🎫</span>
            <span>Code <strong>{code}</strong> is now active. Share it with attendees!</span>
          </div>
        )}

        <div className="notice notice-info" style={{ marginTop: 16 }}>
          <span>ℹ️</span>
          <div>
            <strong>How it works:</strong> Attendees go to the Attendee portal and enter this code.
            Only those with the correct code see event info. Use <em>Deactivate</em> to block
            access when the event ends.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feedback Manager ──────────────────────────────────────── */
function FeedbackManager({ coordinatorId }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState("all");

  const [insight, setInsight] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insightError, setInsightError] = useState("");

  const generateAIInsights = async () => {
    if (feedbacks.length === 0) return;

    setIsAnalyzing(true);
    setInsightError("");
    setInsight(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setInsightError("Gemini API Key is missing! Set VITE_GEMINI_API_KEY in your .env file.");
      setIsAnalyzing(false);
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

      // Compile feedback into a prompt
      const feedbackTexts = feedbacks
        .filter(f => f.comment && f.comment.trim() !== "")
        .map(f => `[${f.rating} Stars, Category: ${f.category}]: ${f.comment}`)
        .join("\n");

      if (!feedbackTexts) {
        setInsight("Not enough written comments to generate insights.");
        setIsAnalyzing(false);
        return;
      }

      const prompt = `You are an event management expert analyzing feedback from attendees.
Here is the feedback submitted during the event:

${feedbackTexts}

Please provide a concise, high-level summary of the overall crowd sentiment, highlight what is working well, and point out immediate actionable areas for improvement. Keep it under 4 sentences and format it nicely.`;

      const result = await model.generateContent(prompt);
      setInsight(result.response.text());
    } catch (err) {
      setInsightError(err.message || "Failed to generate insights.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Listen to all feedbacks for this coordinator
    const qFeed = query(collection(db, "feedback"), where("coordinatorId", "==", coordinatorId));
    const unsub = onSnapshot(qFeed, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by newest first
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFeedbacks(data);
      setLoading(false);
    });
    return unsub;
  }, [coordinatorId]);

  const filteredFeedbacks = feedbacks.filter(f => {
    if (starFilter === "all") return true;
    return f.rating === parseInt(starFilter, 10);
  });

  const getStarString = (rating) => {
    let s = "";
    for (let i = 1; i <= 5; i++) {
      s += i <= rating ? "⭐" : "☆";
    }
    return s;
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: 4 }}>📝 Event Feedback</h2>
          <p className="section-subtitle" style={{ margin: 0 }}>Review what attendees are saying about the event.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: 4 }}>Filter by Stars</label>
            <select className="form-select" value={starFilter} onChange={(e) => setStarFilter(e.target.value)} style={{ minWidth: 140 }}>
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={generateAIInsights}
            disabled={isAnalyzing || loading || feedbacks.length === 0}
            style={{ background: "linear-gradient(135deg, #1A73E8, #a920ab)", border: "none" }}
          >
            {isAnalyzing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "✨ AI Insights"}
          </button>
        </div>
      </div>

      {/* AI Insight Box */}
      {(insight || insightError || isAnalyzing) && (
        <div className="panel" style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(26, 115, 232, 0.04)", border: "1px solid rgba(26, 115, 232, 0.15)" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            ✨ Gemini AI Summary
          </h3>
          {isAnalyzing ? (
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ width: 14, height: 14, borderColor: "#1A73E8 transparent transparent transparent" }} /> Analyzing feedback...
            </div>
          ) : insightError ? (
            <div style={{ fontSize: "0.9rem", color: "#d93025" }}>⚠️ {insightError}</div>
          ) : (
            <div style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
              {insight}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          <span className="spinner" style={{ width: 28, height: 28, margin: "0 auto 12px" }} />
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">No feedback matches your filter.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredFeedbacks.map(f => (
            <div key={f.id} className="panel" style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: "1.2rem", letterSpacing: "2px", marginBottom: 4 }}>
                    {getStarString(f.rating)}
                  </div>
                  <span className="tag tag-blue" style={{ textTransform: "capitalize" }}>{f.category}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {f.createdAt ? new Date(f.createdAt.seconds * 1000).toLocaleString() : "Just now"}
                </div>
              </div>
              {f.comment ? (
                <div style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-main)" }}>
                  "{f.comment}"
                </div>
              ) : (
                <div style={{ fontSize: "0.95rem", fontStyle: "italic", color: "var(--text-muted)" }}>
                  No comment provided.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
