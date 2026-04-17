import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import CoordinatorLogin from "./pages/CoordinatorLogin";
import CoordinatorSignup from "./pages/CoordinatorSignup";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import AttendeeGate from "./pages/AttendeeGate";
import AttendeeView from "./pages/AttendeeView";
import AttendeeGuard from "./components/AttendeeGuard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/coordinator/login" element={<CoordinatorLogin />} />
      <Route path="/coordinator/signup" element={<CoordinatorSignup />} />
      <Route path="/coordinator" element={<CoordinatorDashboard />} />

      {/* Attendee code gate */}
      <Route path="/attendee" element={<AttendeeGate />} />

      {/* Protected attendee view — requires valid session code */}
      <Route
        path="/attendee/view"
        element={
          <AttendeeGuard>
            <AttendeeView />
          </AttendeeGuard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
