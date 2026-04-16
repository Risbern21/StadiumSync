import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="page page-bg">
      <div className="landing-hero">
        <div className="landing-logo">🏟️</div>
        <h1 className="landing-title">
          <span className="gradient-text">Stadium</span>
          <span>Sync</span>
        </h1>
        <p className="landing-subtitle">
          Real-time event coordination and a seamless attendee experience — all in one place.
        </p>
      </div>

      <div className="role-cards">
        <Link to="/coordinator/login" className="role-card">
          <div className="role-card-icon coordinator">🎛️</div>
          <div>
            <div className="role-card-title">Coordinator</div>
            <div className="role-card-desc">Manage maps, chants & menus</div>
          </div>
        </Link>

        <Link to="/attendee" className="role-card">
          <div className="role-card-icon attendee">🎟️</div>
          <div>
            <div className="role-card-title">Attendee</div>
            <div className="role-card-desc">View info & join the fun</div>
          </div>
        </Link>
      </div>

      <footer style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.78rem" }}>
        Powered by Firebase &nbsp;·&nbsp; Built for large-scale venues
      </footer>
    </div>
  );
}
