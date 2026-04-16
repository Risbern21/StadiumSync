import { Navigate } from "react-router-dom";

/**
 * Protects /attendee/view — redirects to the gate if no valid session code exists.
 */
export default function AttendeeGuard({ children }) {
  const code = sessionStorage.getItem("ss_event_code");
  if (!code) return <Navigate to="/attendee" replace />;
  return children;
}
