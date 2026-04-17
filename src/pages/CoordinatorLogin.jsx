import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";

export default function CoordinatorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/coordinator");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError(friendlyError(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  function friendlyError(code) {
    const map = {
      "auth/invalid-credential": "Invalid email or password.",
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/popup-closed-by-user": "Sign-in popup was closed.",
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

          <button id="login-submit" type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading || googleLoading}>
            {loading ? <span className="spinner" /> : "Sign In"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0" }}>
          <div style={{ flex: 1, backgroundColor: "var(--border)", height: "1px" }} />
          <span style={{ padding: "0 12px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>or continue with</span>
          <div style={{ flex: 1, backgroundColor: "var(--border)", height: "1px" }} />
        </div>

        <button 
          type="button" 
          className="btn btn-secondary btn-lg btn-full" 
          onClick={handleGoogleLogin} 
          disabled={loading || googleLoading}
          style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", justifyContent: "center", backgroundColor: "white", color: "#3c4043", border: "1px solid #dadce0" }}
        >
          {googleLoading ? <span className="spinner" /> : <>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span style={{ fontWeight: 600 }}>Google</span>
          </>}
        </button>

        <div className="divider" />
        <Link to="/" className="btn btn-secondary btn-full" style={{ marginTop: "4px" }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
