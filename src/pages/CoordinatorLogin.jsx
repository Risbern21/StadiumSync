import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function CoordinatorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/coordinator");
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  function friendlyError(code) {
    const map = {
      "auth/invalid-credential": "Invalid email or password.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
    };
    return map[code] || "Login failed. Please try again.";
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎛️</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "6px" }}>
            Coordinator <span className="gradient-text">Login</span>
          </h1>
          <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
            Sign in to manage your event
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="coordinator-email"
              type="email"
              className="form-input"
              placeholder="coordinator@stadium.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="coordinator-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="notice notice-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button id="login-submit" type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>

        <div className="divider" />
        <Link to="/" className="btn btn-secondary btn-full" style={{ marginTop: "4px" }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
