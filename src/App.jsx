import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import CoordinatorLogin from "./pages/CoordinatorLogin";
import CoordinatorDashboard from "./pages/CoordinatorDashboard";
import AttendeeView from "./pages/AttendeeView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/coordinator/login" element={<CoordinatorLogin />} />
      <Route path="/coordinator" element={<CoordinatorDashboard />} />
      <Route path="/attendee" element={<AttendeeView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
